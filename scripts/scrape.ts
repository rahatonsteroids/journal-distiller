// scripts/scrape.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import axios from "axios";
import * as cheerio from "cheerio";

// Initialize the raw SQL connection (which worked perfectly for you!)
const sql = neon(process.env.DATABASE_URL!);

// ── RSS SOURCES ──────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  { url: "https://bmjopen.bmj.com/rss/current.xml",         journal: "BMJ Open" },
  { url: "https://www.thelancet.com/rssfeed/lancet_current.xml",  journal: "The Lancet" },
];

// ── PUBMED TOPICS ────────────────────────────────────────────────────────────
const PUBMED_TOPICS = [
  { term: "cancer+treatment",                 journal: "PubMed - Cancer" },
  { term: "cardiology+heart+disease",         journal: "PubMed - Cardiology" },
  { term: "diabetes+mellitus",                journal: "PubMed - Diabetes" },
  { term: "neurology+brain",                  journal: "PubMed - Neurology" },
  { term: "infectious+disease",               journal: "PubMed - Infectious Disease" },
  { term: "mental+health+psychiatry",         journal: "PubMed - Mental Health" },
  { term: "general+medicine+clinical+trial",  journal: "PubMed - General Medicine" },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
async function articleExists(url: string): Promise<boolean> {
  const rows = await sql`SELECT id FROM "Article" WHERE url = ${url} LIMIT 1`;
  return rows.length > 0;
}

function toPostgresArray(authors: string): string {
  if (!authors || authors.trim() === "") return "{}";
  const parts = authors.split(",").map((a) => a.trim()).filter(Boolean);
  if (parts.length === 0) return "{}";
  const escaped = parts.map((a) => `"${a.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return "{" + escaped.join(",") + "}";
}

async function insertArticle(data: {
  title: string;
  originalAbstract: string;
  authors: string;
  journalName: string;
  url: string;
  publishedAt: Date;
}) {
  const authorsArr = toPostgresArray(data.authors);

  await sql`
    INSERT INTO "Article" (id, title, "originalAbstract", authors, "journalName", url, "publishedAt", "createdAt")
    VALUES (
      gen_random_uuid(),
      ${data.title},
      ${data.originalAbstract},
      ${authorsArr},
      ${data.journalName},
      ${data.url},
      ${data.publishedAt.toISOString()},
      NOW()
    )
  `;
}

// ── RSS SCRAPER ──────────────────────────────────────────────────────────────
async function scrapeRSS(feedUrl: string, journalName: string): Promise<number> {
  console.log(`\n📡 Fetching RSS: ${journalName}`);
  let added = 0;

  try {
    const response = await axios.get(feedUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    const items = $("item").toArray();

    for (const item of items) {
      const el = $(item);
      const title = el.find("title").text().trim();
      const url = el.find("link").text().trim();
      const originalAbstract = el.find("description").text().trim();
      const publishedAtStr = el.find("pubDate").text().trim();

      const authorsList: string[] = [];
      el.find("dc\\:creator").each((_, a) => {
        authorsList.push($(a).text().trim());
      });

      if (!title || !url) continue;
      if (await articleExists(url)) continue;

      await insertArticle({
        title,
        originalAbstract: originalAbstract || "No abstract provided.",
        authors: authorsList.join(", "),
        journalName,
        url,
        publishedAt: new Date(publishedAtStr || Date.now()),
      });

      added++;
      console.log(`  + Added: ${title.substring(0, 60)}...`);
    }
  } catch (error) {
    console.error(`  ❌ Error fetching ${journalName}:`, error);
  }

  console.log(`  ✅ Done: ${added} new articles from ${journalName}`);
  return added;
}

// ── PUBMED SCRAPER (Using NCBI API) ──────────────────────────────────────────
async function scrapePubMed(term: string, journalName: string): Promise<number> {
  console.log(`\n🔍 Fetching PubMed: ${journalName}`);
  let added = 0;

  try {
    // 1. Search PubMed to get a list of Article IDs (PMIDs)
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmax=15&sort=date`;
    const searchRes = await axios.get(searchUrl, { timeout: 15000 });
    const $search = cheerio.load(searchRes.data, { xmlMode: true });
    
    const ids: string[] = [];
    $search('IdList Id').each((_, el) => {
      ids.push($search(el).text());
    });

    if (ids.length === 0) {
      console.log(`  ~ No articles found for term: ${term}`);
      return 0;
    }

    // 2. Fetch the actual article data using those IDs
    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(',')}&retmode=xml`;
    const fetchRes = await axios.get(fetchUrl, { timeout: 15000 });
    const $ = cheerio.load(fetchRes.data, { xmlMode: true });

    const articles = $('PubmedArticle').toArray();

    for (const article of articles) {
      const el = $(article);
      const title = el.find('ArticleTitle').text().trim();
      const originalAbstract = el.find('AbstractText').text().trim();
      const actualJournalName = el.find('Title').text().trim() || journalName;
      
      const pmid = el.find('PMID').first().text().trim();
      const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
      
      // Extract Authors
      const authorsList: string[] = [];
      el.find('AuthorList Author').each((_, authorEl) => {
        const lastName = $(authorEl).find('LastName').text();
        const initials = $(authorEl).find('Initials').text();
        if (lastName) authorsList.push(`${lastName} ${initials}`);
      });

      // Extract Publish Date
      const year = el.find('PubMedPubDate[PubStatus="pubmed"] Year').text() || new Date().getFullYear().toString();
      const month = el.find('PubMedPubDate[PubStatus="pubmed"] Month').text() || "01";
      const day = el.find('PubMedPubDate[PubStatus="pubmed"] Day').text() || "01";
      const publishedAt = new Date(`${year}-${month}-${day}`);

      // We skip if there's no abstract, since the AI needs it to summarize
      if (!title || !originalAbstract || !url) continue;

      if (await articleExists(url)) continue;

      // Save to database using your raw SQL helper
      await insertArticle({
        title,
        originalAbstract,
        authors: authorsList.length > 0 ? authorsList.join(", ") : "Unknown",
        journalName: actualJournalName,
        url,
        publishedAt,
      });

      added++;
      console.log(`  + Added: ${title.substring(0, 60)}...`);
    }
  } catch (error) {
    console.error(`  ❌ Error fetching PubMed ${term}:`, error);
  }

  console.log(`  ✅ Done: ${added} new articles from ${journalName}`);
  return added;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("====================================");
  console.log("  🏥 Medical Article Scraper Starting ");
  console.log("====================================");

  let totalAdded = 0;

  for (const feed of RSS_FEEDS) {
    const count = await scrapeRSS(feed.url, feed.journal);
    totalAdded += count;
  }

  for (const topic of PUBMED_TOPICS) {
    const count = await scrapePubMed(topic.term, topic.journal);
    totalAdded += count;
  }

  console.log("\n====================================");
  console.log(`  🎉 Done! Added ${totalAdded} total new articles`);
  console.log("====================================");
}

main().catch(console.error);
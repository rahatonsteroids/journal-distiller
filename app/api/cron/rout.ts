// app/api/cron/route.ts
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import axios from "axios";
import * as cheerio from "cheerio";

const RSS_FEEDS = [
  { url: "https://bmjopen.bmj.com/rss/current.xml",              journal: "BMJ Open" },
  { url: "https://www.thelancet.com/rssfeed/lancet_current.xml", journal: "The Lancet" },
];

const PUBMED_TOPICS = [
  { term: "cancer+treatment",                journal: "PubMed - Cancer" },
  { term: "cardiology+heart+disease",        journal: "PubMed - Cardiology" },
  { term: "diabetes+mellitus",               journal: "PubMed - Diabetes" },
  { term: "neurology+brain",                 journal: "PubMed - Neurology" },
  { term: "infectious+disease",              journal: "PubMed - Infectious Disease" },
  { term: "mental+health+psychiatry",        journal: "PubMed - Mental Health" },
  { term: "general+medicine+clinical+trial", journal: "PubMed - General Medicine" },
];

async function articleExists(sql: any, url: string): Promise<boolean> {
  const rows = await sql`SELECT id FROM "Article" WHERE url = ${url} LIMIT 1`;
  return rows.length > 0;
}

async function insertArticle(sql: any, data: {
  title: string;
  originalAbstract: string;
  authors: string;
  journalName: string;
  url: string;
  publishedAt: Date;
}) {
  await sql`
    INSERT INTO "Article" (id, title, "originalAbstract", authors, "journalName", url, "publishedAt", "createdAt")
    VALUES (
      gen_random_uuid(),
      ${data.title},
      ${data.originalAbstract},
      ${data.authors},
      ${data.journalName},
      ${data.url},
      ${data.publishedAt.toISOString()},
      NOW()
    )
  `;
}

async function scrapeRSS(sql: any, feedUrl: string, journalName: string): Promise<number> {
  let added = 0;
  try {
    const response = await axios.get(feedUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    for (const item of $("item").toArray()) {
      const el = $(item);
      const title = el.find("title").text().trim();
      const url = el.find("link").text().trim();
      const originalAbstract = el.find("description").text().trim();
      const publishedAtStr = el.find("pubDate").text().trim();
      const authors: string[] = [];
      el.find("dc\\:creator").each((_, a) => authors.push($(a).text().trim()));
      if (!title || !url || await articleExists(sql, url)) continue;
      await insertArticle(sql, {
        title, url,
        originalAbstract: originalAbstract || "No abstract provided.",
        authors: authors.join(", "),
        journalName,
        publishedAt: new Date(publishedAtStr || Date.now()),
      });
      added++;
    }
  } catch (e) {
    console.error(`RSS error ${journalName}:`, e);
  }
  return added;
}

async function scrapePubMed(sql: any, term: string, journalName: string): Promise<number> {
  let added = 0;
  try {
    const feedUrl = `https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=${term}&limit=15&format=rss`;
    const response = await axios.get(feedUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    for (const item of $("item").toArray()) {
      const el = $(item);
      const title = el.find("title").text().trim();
      const url = el.find("link").text().trim();
      const originalAbstract = el.find("description").text().trim();
      const publishedAtStr = el.find("pubDate").text().trim();
      const authors = el.find("dc\\:creator").text().trim();
      if (!title || !url || await articleExists(sql, url)) continue;
      await insertArticle(sql, {
        title, url,
        originalAbstract: originalAbstract || "No abstract provided.",
        authors: authors || "Unknown",
        journalName,
        publishedAt: new Date(publishedAtStr || Date.now()),
      });
      added++;
    }
  } catch (e) {
    console.error(`PubMed error ${term}:`, e);
  }
  return added;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  let totalAdded = 0;

  for (const feed of RSS_FEEDS) {
    totalAdded += await scrapeRSS(sql, feed.url, feed.journal);
  }
  for (const topic of PUBMED_TOPICS) {
    totalAdded += await scrapePubMed(sql, topic.term, topic.journal);
  }

  return NextResponse.json({
    success: true,
    added: totalAdded,
    timestamp: new Date().toISOString(),
  });
}
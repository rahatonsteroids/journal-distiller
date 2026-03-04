import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

type SummarisePayload = {
  pmid?: string;
  doi?: string;
  journal?: string;
  title?: string;
  abstract?: string;
  url?: string;
};

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractFullTextFromHtml(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, nav, footer, header, aside, form").remove();

  const selectors = [
    "article",
    "main",
    ".article-body",
    ".article__body",
    ".c-article-body",
    ".content-body",
    "#main-content",
    "#content",
  ];

  for (const selector of selectors) {
    const node = $(selector).first();
    if (!node.length) continue;

    const paragraphs = node
      .find("p")
      .toArray()
      .map((p) => cleanText($(p).text()))
      .filter((text) => text.length > 40);

    if (paragraphs.length >= 5) {
      return paragraphs.join("\n");
    }
  }

  const bodyParagraphs = $("body p")
    .toArray()
    .map((p) => cleanText($(p).text()))
    .filter((text) => text.length > 40);

  if (bodyParagraphs.length > 0) {
    return bodyParagraphs.join("\n");
  }

  return cleanText($("body").text());
}

async function fetchHtmlTextFromUrl(url: string): Promise<string> {
  if (!url) return "";
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });
    if (!response.ok) return "";

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return "";

    const html = await response.text();
    return extractFullTextFromHtml(html);
  } catch (error) {
    console.error("HTML fetch error:", error);
    return "";
  }
}

async function resolveDoiLandingUrl(doi: string): Promise<string> {
  if (!doi) return "";
  try {
    const response = await fetch(`https://doi.org/${doi}`, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!response.ok) return "";
    return response.url || "";
  } catch (error) {
    console.error("DOI resolve error:", error);
    return "";
  }
}

async function fetchPubMedFullText(pmid: string): Promise<{ text: string; doi: string; pmcid: string }> {
  if (!pmid) return { text: "", doi: "", pmcid: "" };
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmid}&rettype=xml`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error("PubMed fetch failed:", response.status, response.statusText);
      return { text: "", doi: "", pmcid: "" };
    }
    const xml = await response.text();

    const doiMatch = xml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/i);
    const pmcidMatch = xml.match(/<ArticleId IdType="pmc">(.*?)<\/ArticleId>/i);
    const doi = cleanText(doiMatch?.[1] ?? "");
    const pmcid = cleanText(pmcidMatch?.[1] ?? "");

    if (pmcid) {
      const pmcText = await fetchHtmlTextFromUrl(`https://pmc.ncbi.nlm.nih.gov/articles/${pmcid}/`);
      if (pmcText) return { text: pmcText, doi, pmcid };
    }

    if (doi) {
      const landingUrl = await resolveDoiLandingUrl(doi);
      const doiText = landingUrl ? await fetchHtmlTextFromUrl(landingUrl) : "";
      if (doiText) return { text: doiText, doi, pmcid };
    }

    // Fallback to abstract if full text is unavailable.
    const matches = [...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)];
    const abstract = matches
      .map((m) => m[1].replace(/<[^>]+>/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .substring(0, 12000);

    return { text: abstract, doi, pmcid };
  } catch (error) {
    console.error("PubMed fetch error:", error);
    return { text: "", doi: "", pmcid: "" };
  }
}

async function fetchLancetFullText(doi: string): Promise<string> {
  if (!doi) return "";
  try {
    const landingUrl = await resolveDoiLandingUrl(doi);
    if (!landingUrl) return "";
    return await fetchHtmlTextFromUrl(landingUrl);
  } catch (error) {
    console.error("Lancet fetch error:", error);
    return "";
  }
}

async function fetchBMJFullText(doi: string): Promise<string> {
  if (!doi) return "";
  try {
    const landingUrl = await resolveDoiLandingUrl(doi);
    if (!landingUrl) return "";
    return await fetchHtmlTextFromUrl(landingUrl);
  } catch (error) {
    console.error("BMJ fetch error:", error);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SummarisePayload;
    const pmid = asString(body?.pmid).trim();
    const doi = asString(body?.doi).trim();
    const journal = asString(body?.journal).trim();
    const title = asString(body?.title).trim();
    const abstract = asString(body?.abstract).trim();
    const articleUrl = asString(body?.url).trim();

    if (!title && !abstract && !pmid && !doi && !articleUrl) {
      return NextResponse.json(
        { error: "Invalid payload: provide at least one of title, abstract, pmid, doi, or url" },
        { status: 400 }
      );
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error("Missing GROQ_API_KEY");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    let fullText = abstract;

    if (articleUrl) {
      fullText = (await fetchHtmlTextFromUrl(articleUrl)) || fullText;
    }

    // Fetch from appropriate source
    if (journal.toLowerCase().includes("pubmed")) {
      const pubmed = await fetchPubMedFullText(pmid);
      fullText = pubmed.text || fullText;
    } else if (journal.toLowerCase().includes("lancet")) {
      fullText = (await fetchLancetFullText(doi)) || fullText;
    } else if (journal.toLowerCase().includes("bmj")) {
      fullText = (await fetchBMJFullText(doi)) || fullText;
    } else if (doi) {
      const landingUrl = await resolveDoiLandingUrl(doi);
      fullText = (landingUrl ? await fetchHtmlTextFromUrl(landingUrl) : "") || fullText;
    } else if (pmid) {
      const pubmed = await fetchPubMedFullText(pmid);
      fullText = pubmed.text || fullText;
    }

    if (!fullText) {
      return NextResponse.json(
        { error: "No article text found to summarize" },
        { status: 422 }
      );
    }

    // Call Groq for summarization
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "mixtral-8x7b-32768",
        messages: [
          {
            role: "user",
            content: `Summarize this research paper in 2-3 concise sentences.\nPrioritize key findings, sample/study design, and clinical relevance.\n\nTitle: ${title || "Untitled"}\n\nContent: ${fullText.substring(0, 12000)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const rawGroq = await groqResponse.text();
    const parsedGroq = safeJsonParse(rawGroq);
    const groqData = parsedGroq && typeof parsedGroq === "object" ? (parsedGroq as Record<string, unknown>) : {};

    if (!groqResponse.ok) {
      console.error("Groq API error:", groqResponse.status, groqResponse.statusText, rawGroq.slice(0, 500));
      return NextResponse.json({ error: "Failed to generate summary" }, { status: 502 });
    }

    const choices = Array.isArray(groqData.choices) ? groqData.choices : [];
    const firstChoice = (choices[0] ?? {}) as { message?: { content?: unknown } };
    const generatedSummary = asString(firstChoice.message?.content).trim();

    if (!generatedSummary) {
      console.error("Groq response missing summary content:", rawGroq.slice(0, 500));
      return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
    }

    return NextResponse.json({ summary: generatedSummary });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json({ error: "Failed to summarize" }, { status: 500 });
  }
}

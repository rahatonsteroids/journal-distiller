import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

type SummarisePayload = {
  pmid?: string;
  doi?: string;
  journal?: string;
  title?: string;
  abstract?: string;
  url?: string;
};

const DEFAULT_GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
];

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

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function extractGroqSummary(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as Record<string, unknown>;
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const firstChoice = (choices[0] ?? {}) as { message?: { content?: unknown } };
  return asString(firstChoice.message?.content).trim();
}

function isModelDecommissioned(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const data = payload as Record<string, unknown>;
  const errorObj = data.error;
  if (!errorObj || typeof errorObj !== "object") return false;
  const err = errorObj as Record<string, unknown>;
  return asString(err.code) === "model_decommissioned";
}

async function generateSummaryWithGroq(
  groqApiKey: string,
  prompt: string
): Promise<{ summary: string; status: number }> {
  const configuredModel = asString(process.env.GROQ_MODEL).trim();
  const modelCandidates = configuredModel
    ? [configuredModel, ...DEFAULT_GROQ_MODELS.filter((m) => m !== configuredModel)]
    : DEFAULT_GROQ_MODELS;

  let lastStatus = 502;

  for (const model of modelCandidates) {
    const groqResponse = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    const rawGroq = await groqResponse.text();
    const parsedGroq = safeJsonParse(rawGroq);
    lastStatus = groqResponse.status;

    if (!groqResponse.ok) {
      if (isModelDecommissioned(parsedGroq)) {
        console.warn(`Groq model deprecated, retrying with next model: ${model}`);
        continue;
      }
      console.error("Groq API error:", groqResponse.status, groqResponse.statusText, rawGroq.slice(0, 500));
      return { summary: "", status: 502 };
    }

    const summary = extractGroqSummary(parsedGroq);
    if (summary) return { summary, status: 200 };
    console.error("Groq response missing summary content:", rawGroq.slice(0, 500));
    return { summary: "", status: 500 };
  }

  console.error("All configured Groq models failed or were deprecated.");
  return { summary: "", status: lastStatus >= 400 && lastStatus < 600 ? 502 : 500 };
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
    const response = await fetchWithTimeout(url, {
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
    const extracted = extractFullTextFromHtml(html);
    return extracted.length >= 400 ? extracted : "";
  } catch (error) {
    console.error("HTML fetch error:", error);
    return "";
  }
}

async function resolveDoiLandingUrl(doi: string): Promise<string> {
  if (!doi) return "";
  try {
    const response = await fetchWithTimeout(`https://doi.org/${doi}`, {
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
    const response = await fetchWithTimeout(url, undefined, 9000);
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

    const summaryInput = fullText || abstract || title;
    if (!summaryInput) {
      return NextResponse.json({ error: "No article text found to summarize" }, { status: 400 });
    }

    const prompt = `Summarize this research paper in 2-3 concise sentences.\nPrioritize key findings, sample/study design, and clinical relevance.\n\nTitle: ${
      title || "Untitled"
    }\n\nContent: ${summaryInput.substring(0, 10000)}`;

    const groqResult = await generateSummaryWithGroq(groqApiKey, prompt);
    if (!groqResult.summary) {
      return NextResponse.json({ error: "Failed to generate summary" }, { status: groqResult.status });
    }

    return NextResponse.json({ summary: groqResult.summary });
  } catch (error) {
    console.error("Summarization error:", error);
    return NextResponse.json({ error: "Failed to summarize" }, { status: 500 });
  }
}

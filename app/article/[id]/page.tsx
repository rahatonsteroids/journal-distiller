import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/prisma";
import SaveButton from "@/components/SaveButton";

function cleanXMLContent(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&rsquo;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sql = getDb();

  try {
    const rows = await sql`
      SELECT 
        a.id,
        a.title,
        a."journalName",
        a."publishedAt",
        a.authors,
        a.doi,
        a.url,
        a."originalAbstract",
        s."bottomLine",
        s.methodology,
        s."clinicalImpact"
      FROM "Article" a
      LEFT JOIN "Summary" s ON s."articleId" = a.id
      WHERE a.id = ${id}
      LIMIT 1
    `;

    if (rows.length === 0) {
      notFound();
    }

    const article = rows[0];
    const authors = Array.isArray(article.authors)
      ? article.authors.join(", ")
      : String(article.authors ?? "");

    return (
      <div className="min-h-screen bg-[#f6f7f8] text-slate-900 dark:bg-[#101822] dark:text-slate-100">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-[#15202e]/90">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-slate-700 hover:text-[#136dec] dark:text-slate-300">
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium">Back</span>
            </Link>
            <h1 className="truncate text-lg font-bold">Article Summary</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:pb-10">
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#136dec]">
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
              {article.journalName}
            </div>
            <h2 className="text-2xl font-bold leading-tight">{article.title}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
              {authors && <span>{authors}</span>}
              <span>{new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          <section className="mb-6 rounded-xl border border-[#136dec]/20 bg-white p-5 shadow-sm dark:bg-[#15202e]">
            <div className="mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#136dec]">auto_awesome</span>
              <h3 className="text-lg font-bold">AI Distilled Abstract</h3>
            </div>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              {article.bottomLine
                ? cleanXMLContent(article.bottomLine)
                : cleanXMLContent(article.originalAbstract)}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15202e]">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#136dec]">science</span>
                <h3 className="text-lg font-bold">Methodology</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {article.methodology
                  ? cleanXMLContent(article.methodology)
                  : "Methodology details were not available for this article."}
              </p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15202e]">
              <div className="mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#136dec]">medical_services</span>
                <h3 className="text-lg font-bold">Clinical Implications</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {article.clinicalImpact
                  ? cleanXMLContent(article.clinicalImpact)
                  : "Clinical implications are not available for this article yet."}
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#15202e]">
            <h3 className="mb-3 text-lg font-bold">Original Abstract</h3>
            <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {article.originalAbstract
                ? cleanXMLContent(article.originalAbstract)
                : "No abstract available."}
            </p>
          </section>
        </main>

        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/95 px-4 pb-6 pt-3 backdrop-blur dark:border-slate-800 dark:bg-[#15202e]/95">
          <div className="mx-auto flex w-full max-w-5xl gap-2">
            <div className="flex-1">
              <SaveButton articleId={article.id} />
            </div>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                View Paper
              </a>
            )}
            {article.doi && (
              <a
                href={`https://doi.org/${article.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center rounded-xl bg-[#136dec] px-4 py-2.5 text-sm font-semibold text-white"
              >
                DOI
              </a>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching article:", error);
    notFound();
  }
}

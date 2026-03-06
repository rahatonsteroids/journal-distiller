import Link from "next/link";
import { getDb } from "@/lib/prisma";
import SummariseButton from "@/components/SummariseButton";

type HomeArticle = {
  id: string;
  title: string;
  originalAbstract: string;
  journalName: string;
  publishedAt: string | Date;
  url: string;
  doi: string | null;
};
type JournalRow = {
  id: number;
  name: string;
  url: string;
};

const PAGE_SIZE = 20;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const sql = getDb();
  let articles: HomeArticle[] = [];
  let allJournals: JournalRow[] = [];
  let totalArticles = 0;
  const resolvedSearchParams = (await searchParams) ?? {};
  const currentPage = Math.max(1, Number.parseInt(resolvedSearchParams.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  try {
    const countRows = await sql`SELECT COUNT(*)::int AS count FROM "Article"`;
    totalArticles = Number(countRows[0]?.count ?? 0);

    const [rows, journalRows] = await Promise.all([
      sql`
      SELECT id, title, "originalAbstract", "journalName", "publishedAt", url, doi
      FROM "Article"
      ORDER BY "publishedAt" DESC
      LIMIT ${PAGE_SIZE}
      OFFSET ${offset}
    `,
      sql`
      SELECT id, name, url
      FROM journals
      ORDER BY id DESC
      `,
    ]);
    articles = rows as HomeArticle[];
    allJournals = journalRows as JournalRow[];
  } catch (error) {
    console.error("Home article query error:", error);
  }

  const hasMore = currentPage * PAGE_SIZE < totalArticles;
  const hasPrevious = currentPage > 1;
  const journals = allJournals.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#0b2a66] text-white">
      <header className="flex items-center justify-between p-4 pb-2 pt-10">
        <h1 className="text-xl font-bold tracking-tight">Journal Distiller</h1>
        <Link href="/admin" className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold">
          Admin
        </Link>
      </header>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between px-4">
          <h2 className="text-base font-bold">Journals</h2>
          <Link href="/journals" className="text-sm font-medium text-white/90 hover:underline">
            View All
          </Link>
        </div>
        <div className="scrollbar-hide flex snap-x gap-3 overflow-x-auto px-4 pb-4 pt-1">
          {journals.length > 0 ? (
            journals.map((journal) => (
              <span
                key={journal.id}
                className="inline-flex min-w-fit snap-start items-center rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium"
              >
                {journal.name}
              </span>
            ))
          ) : (
            <span className="text-sm text-white/75">No journals found yet.</span>
          )}
        </div>
      </section>

      <section className="mt-2 px-4 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">Latest Articles</h2>
          <span className="text-xs text-white/80">{totalArticles} total</span>
        </div>
        <div className="flex flex-col gap-4">
          {articles.map((article) => (
            <article key={article.id} className="flex flex-col gap-3 rounded-xl border border-white/60 bg-white p-4 shadow-sm">
              <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">{article.title}</h3>

              <p className="line-clamp-3 text-xs text-slate-600">{article.originalAbstract || "No abstract available."}</p>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-500">{article.journalName}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] text-slate-500">
                    {new Date(article.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <a href={`/article/${article.id}`} className="text-[10px] font-bold text-[#136dec]">
                  View Details
                </a>
              </div>

              <SummariseButton
                payload={{
                  title: article.title,
                  abstract: article.originalAbstract,
                  url: article.url,
                  journal: article.journalName,
                  doi: article.doi,
                }}
              />
            </article>
          ))}

          {articles.length === 0 && (
            <div className="rounded-xl border border-white/30 bg-white/10 p-4 text-sm text-white/85">
              No articles found. Add sources in admin and run your scraper.
            </div>
          )}

          {(hasPrevious || hasMore) && (
            <div className="mt-2 flex items-center justify-center gap-3">
              {hasPrevious && (
                <Link
                  href={currentPage === 2 ? "/" : `/?page=${currentPage - 1}`}
                  className="rounded-md bg-white/15 px-3 py-2 text-xs font-semibold"
                >
                  Previous
                </Link>
              )}
              {hasMore && (
                <Link href={`/?page=${currentPage + 1}`} className="rounded-md bg-white px-3 py-2 text-xs font-bold text-[#0b2a66]">
                  View More Articles
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="fixed bottom-0 z-10 flex w-full gap-2 border-t border-white/25 bg-[#0b2a66]/95 px-4 pb-6 pt-3 backdrop-blur-md">
        <Link href="/" className="flex flex-1 flex-col items-center justify-center gap-1 text-white">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            home
          </span>
          <p className="text-[10px] font-bold tracking-wide">Home</p>
        </Link>
        <Link href="/discover" className="flex flex-1 flex-col items-center justify-center gap-1 text-white/70 transition-colors hover:text-white">
          <span className="material-symbols-outlined">explore</span>
          <p className="text-[10px] font-medium tracking-wide">Discover</p>
        </Link>
        <Link href="/saved" className="flex flex-1 flex-col items-center justify-center gap-1 text-white/70 transition-colors hover:text-white">
          <span className="material-symbols-outlined">bookmarks</span>
          <p className="text-[10px] font-medium tracking-wide">Saved</p>
        </Link>
        <Link href="/profile" className="flex flex-1 flex-col items-center justify-center gap-1 text-white/70 transition-colors hover:text-white">
          <span className="material-symbols-outlined">person</span>
          <p className="text-[10px] font-medium tracking-wide">Profile</p>
        </Link>
      </div>
    </div>
  );
}

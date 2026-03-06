import { getDb } from "@/lib/prisma";
import { cookies } from "next/headers";
import Link from "next/link";

export const revalidate = 0;
const PAGE_SIZE = 24;

interface Article {
  id: string;
  title: string;
  originalAbstract: string;
  journalName: string;
  publishedAt: string;
  authors?: string;
  pmid?: string;
}

interface Journal {
  id: number;
  name: string;
  url: string;
}

export default async function NewDesignPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; journal?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const query = params.q?.trim() ?? "";
  const selectedJournal = params.journal?.trim() ?? "";
  const offset = (currentPage - 1) * PAGE_SIZE;

  let articles: Article[] = [];
  let totalCount = 0;
  let journals: Journal[] = [];
  let fetchError = false;

  const cookieStore = await cookies();
  const userId = cookieStore.get("user_id")?.value;

  try {
    const sql = getDb();

    // Get journals
    const journalRows = await sql`SELECT id, name, url FROM journals ORDER BY name ASC`;
    journals = journalRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      url: String(row.url),
    }));

    // Get articles
    const hasSearch = !!query;
    const hasJournal = !!selectedJournal;

    if (hasSearch && hasJournal) {
      const searchTerm = `%${query}%`;
      const [rows, countRows] = await Promise.all([
        sql`
          SELECT * FROM "Article"
          WHERE (title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm})
            AND "journalName" = ${selectedJournal}
          ORDER BY "publishedAt" DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS count FROM "Article"
          WHERE (title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm})
            AND "journalName" = ${selectedJournal}
        `,
      ]);
      articles = rows;
      totalCount = countRows[0].count;
    } else if (hasSearch) {
      const searchTerm = `%${query}%`;
      const [rows, countRows] = await Promise.all([
        sql`
          SELECT * FROM "Article"
          WHERE title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm}
          ORDER BY "publishedAt" DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM "Article" WHERE title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm}`,
      ]);
      articles = rows;
      totalCount = countRows[0].count;
    } else if (hasJournal) {
      const [rows, countRows] = await Promise.all([
        sql`SELECT * FROM "Article" WHERE "journalName" = ${selectedJournal} ORDER BY "publishedAt" DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
        sql`SELECT COUNT(*)::int AS count FROM "Article" WHERE "journalName" = ${selectedJournal}`,
      ]);
      articles = rows;
      totalCount = countRows[0].count;
    } else {
      const [rows, countRows] = await Promise.all([
        sql`SELECT * FROM "Article" ORDER BY "publishedAt" DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`,
        sql`SELECT COUNT(*)::int AS count FROM "Article"`,
      ]);
      articles = rows;
      totalCount = countRows[0].count;
    }
  } catch (error) {
    console.error("Database error:", error);
    fetchError = true;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function buildUrl(overrides: { page?: number; q?: string; journal?: string }) {
    const p = overrides.page ?? currentPage;
    const q2 = overrides.q !== undefined ? overrides.q : query;
    const j = overrides.journal !== undefined ? overrides.journal : selectedJournal;
    const parts: string[] = [];
    if (p > 1) parts.push(`page=${p}`);
    if (q2) parts.push(`q=${encodeURIComponent(q2)}`);
    if (j) parts.push(`journal=${encodeURIComponent(j)}`);
    return `/new-design?${parts.join("&")}`;
  }

  return (
    <html className="dark" lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Journal Distiller - Medical Research Feed</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <script id="tailwind-config" dangerouslySetInnerHTML={{__html: `
          tailwind.config = {
            darkMode: "class",
            theme: {
              extend: {
                colors: {
                  "primary": "#136dec",
                  "background-light": "#f6f7f8",
                  "background-dark": "#101822",
                },
                fontFamily: {
                  "display": ["Manrope", "sans-serif"]
                },
              },
            },
          }
        `}} />
        <style dangerouslySetInnerHTML={{__html: `
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
          body {
            min-height: 100vh;
            font-family: 'Manrope', sans-serif;
          }
          .masonry-grid {
            column-count: 1;
            column-gap: 1rem;
          }
          @media (min-width: 768px) {
            .masonry-grid {
              column-count: 2;
            }
          }
          @media (min-width: 1024px) {
            .masonry-grid {
              column-count: 3;
            }
          }
          .masonry-item {
            break-inside: avoid;
            margin-bottom: 1rem;
          }
        `}} />
      </head>
      <body className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
        <div className="flex flex-col lg:flex-row h-screen overflow-hidden">
          {/* Left Sidebar */}
          <aside className="hidden lg:flex lg:w-64 bg-white dark:bg-[#15212d] border-r border-slate-200 dark:border-slate-800 flex-col h-screen flex-shrink-0">
            <div className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-xl">science</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">Journal Distiller</h1>
            </div>
            
            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              <ul className="space-y-1">
                <li>
                  <Link href="/new-design" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium">
                    <span className="material-symbols-outlined">dashboard</span>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                    <span className="material-symbols-outlined">home</span>
                    Home
                  </Link>
                </li>
                {userId && (
                  <li>
                    <Link href="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300">
                      <span className="material-symbols-outlined">person</span>
                      Profile
                    </Link>
                  </li>
                )}
              </ul>

              <div>
                <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-3">Filter by Journal</h3>
                <ul className="space-y-2 px-3">
                  {journals.slice(0, 6).map((j) => (
                    <li key={j.id}>
                      <Link 
                        href={`/new-design?journal=${encodeURIComponent(j.name)}`}
                        className="flex items-center justify-between text-sm hover:text-primary transition-colors"
                      >
                        <span>{j.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#15212d] border-b border-slate-200 dark:border-slate-800 z-10 shrink-0">
              <div className="flex items-center gap-4 flex-1">
                <h1 className="text-xl lg:text-2xl font-bold">Journal Distiller</h1>
                <form method="GET" action="/new-design" className="hidden lg:flex items-center gap-4 flex-1 max-w-md">
                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input 
                      name="q"
                      defaultValue={query}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-[#0c131a] border-none rounded-full text-sm focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-100" 
                      placeholder="Search articles..." 
                      type="text"
                    />
                  </div>
                </form>
              </div>
              
              <div className="flex items-center gap-3">
                {!userId ? (
                  <>
                    <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors">
                      Login
                    </Link>
                    <Link href="/auth/signup" className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                    <span className="material-symbols-outlined">person</span>
                    <span className="hidden sm:inline text-sm">Profile</span>
                  </Link>
                )}
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-transparent">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Research Articles</h2>
                <div className="flex gap-2">
                  <select 
                    value={selectedJournal}
                    onChange={(e) => {
                      const url = new URL(window.location.href);
                      url.searchParams.delete('page');
                      if (e.target.value) {
                        url.searchParams.set('journal', e.target.value);
                      } else {
                        url.searchParams.delete('journal');
                      }
                      window.location.href = url.toString();
                    }}
                    className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">All Journals</option>
                    {journals.map((j) => (
                      <option key={j.id} value={j.name}>{j.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="masonry-grid">
                {articles.map((article) => (
                  <div key={article.id} className="masonry-item bg-white dark:bg-[#1c2a3a] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded">
                          {article.journalName}
                        </span>
                        {userId && (
                          <button className="text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined text-[20px]">bookmark_border</span>
                          </button>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold leading-tight mb-2 line-clamp-3">
                        <Link href={`/article/${article.id}`} className="hover:text-primary transition-colors">
                          {article.title}
                        </Link>
                      </h3>
                      
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-grow">
                        {article.originalAbstract}
                      </p>
                      
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(article.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <Link href={`/article/${article.id}`} className="text-sm font-medium text-primary hover:text-primary/80">
                          Read More
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    {currentPage > 1 && (
                      <Link href={buildUrl({ page: currentPage - 1 })} className="px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                        Previous
                      </Link>
                    )}
                    {currentPage < totalPages && (
                      <Link href={buildUrl({ page: currentPage + 1 })} className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90">
                        Next
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 w-full bg-white dark:bg-[#15212d] border-t border-slate-200 dark:border-slate-800 z-50">
          <div className="flex justify-around items-center h-16 px-4">
            <Link href="/new-design" className="flex flex-col items-center justify-center gap-1 text-primary">
              <span className="material-symbols-outlined text-2xl">home</span>
              <span className="text-[10px] font-medium">Home</span>
            </Link>
            <Link href="/" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-2xl">search</span>
              <span className="text-[10px] font-medium">Browse</span>
            </Link>
            {userId && (
              <>
                <Link href="/profile" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-2xl">bookmark</span>
                  <span className="text-[10px] font-medium">Saved</span>
                </Link>
                <Link href="/profile" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-2xl">person</span>
                  <span className="text-[10px] font-medium">Profile</span>
                </Link>
              </>
            )}
            {!userId && (
              <Link href="/auth/login" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-2xl">login</span>
                <span className="text-[10px] font-medium">Login</span>
              </Link>
            )}
          </div>
        </nav>
      </body>
    </html>
  );
}

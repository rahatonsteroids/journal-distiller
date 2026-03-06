import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/prisma";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import JournalManager from "./JournalManager";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    redirect("/admin/login");
  }

  let totalArticles = 0;
  let totalJournals = 0;
  let latestJournals: { id: number; name: string; url: string }[] = [];

  try {
    const sql = getDb();
    const [articleCountRows, journalCountRows, journalRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM "Article"`,
      sql`SELECT COUNT(*)::int AS count FROM journals`,
      sql`SELECT id, name, url FROM journals ORDER BY id DESC LIMIT 8`,
    ]);

    totalArticles = Number(articleCountRows[0]?.count ?? 0);
    totalJournals = Number(journalCountRows[0]?.count ?? 0);
    latestJournals = journalRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name ?? ""),
      url: String(row.url ?? ""),
    }));
  } catch (error) {
    console.error("Admin query error:", error);
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Articles</p>
            <p className="text-2xl font-bold">{totalArticles}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Journals</p>
            <p className="text-2xl font-bold">{totalJournals}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">API Success</p>
            <p className="text-2xl font-bold">99.8%</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Avg Distillation</p>
            <p className="text-2xl font-bold">1.2s</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-4 text-lg font-bold">Scraping Sources</h2>
          <div className="space-y-2">
            {latestJournals.map((journal) => (
              <div key={journal.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="font-semibold">{journal.name}</p>
                  <p className="text-xs text-slate-500">{journal.url}</p>
                </div>
                <span className="rounded-full bg-[#136dec]/10 px-3 py-1 text-xs font-semibold text-[#136dec]">
                  Active
                </span>
              </div>
            ))}
            {latestJournals.length === 0 && (
              <div className="rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-600">
                No journals found. Add journals from the admin tools.
              </div>
            )}
          </div>
        </section>

        <JournalManager journals={latestJournals} />
      </main>
    </div>
  );
}

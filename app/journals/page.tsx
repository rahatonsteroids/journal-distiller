import Link from "next/link";
import { getDb } from "@/lib/prisma";

type JournalRow = {
  id: number;
  name: string;
  url: string;
};

export default async function JournalsPage() {
  let journals: JournalRow[] = [];

  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, name, url
      FROM journals
      ORDER BY id DESC
    `;
    journals = rows as JournalRow[];
  } catch (error) {
    console.error("Journals page query error:", error);
  }

  return (
    <main className="min-h-screen bg-[#0b2a66] p-6 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">All Journals</h1>
            <p className="mt-1 text-sm text-white/80">{journals.length} listed</p>
          </div>
          <Link href="/" className="text-sm font-medium hover:underline">
            Back
          </Link>
        </div>

        <div className="rounded-xl border border-white/20 bg-white/10 p-4">
          <ul className="space-y-3">
            {journals.map((journal) => (
              <li key={journal.id} className="rounded-lg border border-white/15 bg-white/5 px-4 py-3">
                <p className="font-semibold">{journal.name}</p>
                <p className="mt-1 break-all text-xs text-white/75">{journal.url}</p>
              </li>
            ))}
            {journals.length === 0 && (
              <li className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80">
                No journals found.
              </li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}

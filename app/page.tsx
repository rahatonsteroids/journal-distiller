// app/page.tsx
import { getDb } from "../lib/prisma";
import ArticleCard from "../components/ArticleCard";

export const revalidate = 0;
const PAGE_SIZE = 24;

function EmptyState({ query }: { query: string }) {
  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px dashed #2a2520", color: "#6b6358", gridColumn: "1/-1" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>&#8709;</div>
      <p style={{ fontSize: "0.9rem" }}>
        {query ? `No results for "${query}"` : "No articles found."}
      </p>
    </div>
  );
}

function ErrorState() {
  return (
    <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px dashed #c8a96e", color: "#c8a96e", gridColumn: "1/-1" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>!</div>
      <p style={{ fontSize: "0.9rem" }}>Failed to connect to the database.</p>
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; journal?: string }>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10));
  const query = params.q?.trim() ?? "";
  const selectedJournal = params.journal?.trim() ?? "";
  const offset = (currentPage - 1) * PAGE_SIZE;

  let articles: any[] = [];
  let totalCount = 0;
  let fetchError = false;
  let journals: string[] = [];

  try {
    const sql = getDb();

    // Get all unique journal names for the dropdown
    const journalRows = await sql`SELECT DISTINCT "journalName" FROM "Article" ORDER BY "journalName" ASC`;
    journals = journalRows.map((r: any) => r.journalName);

    // Build conditions
    const hasSearch = !!query;
    const hasJournal = !!selectedJournal;

    if (hasSearch && hasJournal) {
      const searchTerm = `%${query}%`;
      const [rows, countRows] = await Promise.all([
        sql`
          SELECT * FROM "Article"
          WHERE (title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm} OR "journalName" ILIKE ${searchTerm})
            AND "journalName" = ${selectedJournal}
          ORDER BY "publishedAt" DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `,
        sql`
          SELECT COUNT(*)::int AS count FROM "Article"
          WHERE (title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm} OR "journalName" ILIKE ${searchTerm})
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
          WHERE title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm} OR "journalName" ILIKE ${searchTerm}
          ORDER BY "publishedAt" DESC
          LIMIT ${PAGE_SIZE} OFFSET ${offset}
        `,
        sql`SELECT COUNT(*)::int AS count FROM "Article" WHERE title ILIKE ${searchTerm} OR "originalAbstract" ILIKE ${searchTerm} OR "journalName" ILIKE ${searchTerm}`,
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
    console.error("Database connection error:", error);
    fetchError = true;
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  function buildUrl(overrides: { page?: number; q?: string; journal?: string }) {
    const p = overrides.page ?? currentPage;
    const q2 = overrides.q !== undefined ? overrides.q : query;
    const j = overrides.journal !== undefined ? overrides.journal : selectedJournal;
    const parts: string[] = [];
    if (p > 1) parts.push(`page=${p}`);
    if (q2) parts.push(`q=${encodeURIComponent(q2)}`);
    if (j) parts.push(`journal=${encodeURIComponent(j)}`);
    return parts.length ? `/?${parts.join("&")}` : "/";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Outfit:wght@200;300;400;500&display=swap');

        :root {
          --bg: #080807;
          --border: #1e1c18;
          --gold: #c8a96e;
          --ink: #f0ebe0;
          --ink-mid: #a09880;
          --ink-dim: #4a4540;
          --ink-faint: #2a2520;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: var(--ink);
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          min-height: 100vh;
        }

        body::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            radial-gradient(ellipse 80% 50% at 20% -10%, rgba(200,169,110,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 110%, rgba(200,169,110,0.04) 0%, transparent 60%);
          pointer-events: none; z-index: 0;
        }

        /* NAV */
        .nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(8,8,7,0.88);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border);
        }
        .nav-inner {
          max-width: 1200px; margin: 0 auto;
          padding: 0 2rem; height: 60px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem;
        }
        .nav-brand { display: flex; align-items: baseline; gap: 0.4rem; text-decoration: none; flex-shrink: 0; }
        .nav-brand-name {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.3rem; font-weight: 700; font-style: italic;
          color: var(--ink); letter-spacing: 0.02em;
        }
        .nav-brand-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--gold); display: inline-block;
          margin-bottom: 2px; flex-shrink: 0;
        }
        .nav-right { display: flex; align-items: center; gap: 1rem; }
        .nav-date { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-dim); }
        .nav-pill {
          font-size: 0.62rem; font-weight: 500; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--gold);
          border: 1px solid var(--ink-faint); padding: 4px 12px;
          white-space: nowrap; flex-shrink: 0;
        }

        /* JOURNAL DROPDOWN */
        .journal-select-wrap { position: relative; flex-shrink: 0; }
        .journal-select {
          appearance: none;
          background: #0f0f0e;
          border: 1px solid var(--ink-faint);
          color: var(--gold);
          font-family: 'Outfit', sans-serif;
          font-size: 0.62rem; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 5px 28px 5px 12px;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s ease;
          max-width: 180px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .journal-select:hover, .journal-select:focus { border-color: var(--gold); }
        .journal-select option { background: #0f0f0e; color: var(--ink); text-transform: none; font-size: 0.8rem; letter-spacing: 0; }
        .journal-select-arrow {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          pointer-events: none; color: var(--gold); font-size: 0.6rem;
        }

        /* HERO */
        .hero { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 5rem 2rem 0; }
        .hero-rule-gold { border: none; border-top: 2px solid var(--gold); width: 48px; margin-bottom: 2rem; }
        .hero-label { font-size: 0.62rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold); margin-bottom: 1.25rem; }
        .hero-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3rem, 7vw, 6.5rem);
          font-weight: 300; line-height: 0.92;
          letter-spacing: -0.02em; color: var(--ink); margin-bottom: 2rem;
        }
        .hero-title em { font-style: italic; font-weight: 300; color: var(--ink-mid); }
        .hero-bottom {
          display: flex; align-items: flex-end; justify-content: space-between;
          gap: 2rem; padding-bottom: 3rem; border-bottom: 1px solid var(--border);
        }
        .hero-desc { font-size: 0.8rem; line-height: 1.8; color: var(--ink-mid); font-weight: 300; max-width: 380px; }
        .hero-stat { text-align: right; flex-shrink: 0; }
        .hero-stat-num {
          font-family: 'Cormorant Garamond', serif;
          font-size: 3.5rem; font-weight: 300; line-height: 1;
          color: var(--ink); letter-spacing: -0.04em;
        }
        .hero-stat-label { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-dim); margin-top: 0.25rem; }

        /* SEARCH */
        .search-section {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 2.5rem 2rem 0;
        }
        .search-form {
          display: flex; align-items: stretch;
          border: 1px solid var(--border);
          transition: border-color 0.2s ease;
        }
        .search-form:focus-within { border-color: var(--gold); }
        .search-input {
          flex: 1; background: #0f0f0e;
          border: none; outline: none;
          padding: 0.875rem 1.25rem;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem; font-weight: 300;
          color: var(--ink); letter-spacing: 0.02em;
        }
        .search-input::placeholder { color: var(--ink-dim); }
        .search-btn {
          background: transparent;
          border: none; border-left: 1px solid var(--border);
          padding: 0.875rem 1.5rem; cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 0.62rem; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: var(--gold); transition: background 0.2s ease;
          white-space: nowrap;
        }
        .search-btn:hover { background: rgba(200,169,110,0.08); }
        .search-meta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;
        }
        .search-results-label { font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
        .search-results-label strong { color: var(--gold); font-weight: 500; }
        .search-clear {
          font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--ink-dim); text-decoration: none; transition: color 0.2s ease;
        }
        .search-clear:hover { color: var(--gold); }

        /* ACTIVE JOURNAL BADGE */
        .journal-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          font-size: 0.6rem; font-weight: 500; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--gold);
          border: 1px solid var(--gold); padding: 3px 10px;
          background: rgba(200,169,110,0.06);
        }
        .journal-badge a {
          color: var(--ink-dim); text-decoration: none; font-size: 0.65rem;
          transition: color 0.2s;
        }
        .journal-badge a:hover { color: var(--gold); }

        /* DIVIDER */
        .section-divider { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }
        .section-divider-bar { display: flex; align-items: center; gap: 1rem; padding: 1rem 0; }
        .section-divider-label { font-size: 0.58rem; font-weight: 500; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-dim); white-space: nowrap; }
        .section-divider-line { flex: 1; height: 1px; background: var(--border); }

        /* GRID */
        .grid-section { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 2.5rem 2rem 4rem; }
        .articles-grid {
          display: grid; grid-template-columns: 1fr;
          gap: 1px; background: var(--border); border: 1px solid var(--border);
        }
        @media (min-width: 680px) { .articles-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .articles-grid { grid-template-columns: repeat(3, 1fr); } }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .articles-grid > * { animation: fadeUp 0.5s ease both; }
        .articles-grid > *:nth-child(1)  { animation-delay: 0.000s; }
        .articles-grid > *:nth-child(2)  { animation-delay: 0.035s; }
        .articles-grid > *:nth-child(3)  { animation-delay: 0.070s; }
        .articles-grid > *:nth-child(4)  { animation-delay: 0.105s; }
        .articles-grid > *:nth-child(5)  { animation-delay: 0.140s; }
        .articles-grid > *:nth-child(6)  { animation-delay: 0.175s; }
        .articles-grid > *:nth-child(7)  { animation-delay: 0.210s; }
        .articles-grid > *:nth-child(8)  { animation-delay: 0.245s; }
        .articles-grid > *:nth-child(9)  { animation-delay: 0.280s; }
        .articles-grid > *:nth-child(10) { animation-delay: 0.315s; }
        .articles-grid > *:nth-child(11) { animation-delay: 0.350s; }
        .articles-grid > *:nth-child(12) { animation-delay: 0.385s; }
        .articles-grid > *:nth-child(13) { animation-delay: 0.420s; }
        .articles-grid > *:nth-child(14) { animation-delay: 0.455s; }
        .articles-grid > *:nth-child(15) { animation-delay: 0.490s; }
        .articles-grid > *:nth-child(16) { animation-delay: 0.525s; }
        .articles-grid > *:nth-child(17) { animation-delay: 0.560s; }
        .articles-grid > *:nth-child(18) { animation-delay: 0.595s; }
        .articles-grid > *:nth-child(19) { animation-delay: 0.630s; }
        .articles-grid > *:nth-child(20) { animation-delay: 0.665s; }
        .articles-grid > *:nth-child(21) { animation-delay: 0.700s; }
        .articles-grid > *:nth-child(22) { animation-delay: 0.735s; }
        .articles-grid > *:nth-child(23) { animation-delay: 0.770s; }
        .articles-grid > *:nth-child(24) { animation-delay: 0.805s; }

        /* ARTICLE CARD */
        .ac-card {
          font-family: 'Outfit', sans-serif;
          position: relative; background: #0f0f0e;
          overflow: hidden; transition: background 0.3s ease, box-shadow 0.3s ease;
          display: flex; flex-direction: column; height: 100%;
        }
        .ac-card:hover { background: #141412; }
        .ac-card.ac-highlighted {
          background: #131109;
          box-shadow: inset 0 0 0 1px rgba(200,169,110,0.3);
        }
        .ac-card.ac-highlighted .ac-top-bar { transform: scaleX(1); }
        .ac-glow {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at top left, rgba(200,169,110,0.07) 0%, transparent 60%);
          opacity: 0; transition: opacity 0.4s ease; pointer-events: none;
        }
        .ac-card:hover .ac-glow { opacity: 1; }
        .ac-card.ac-highlighted .ac-glow { opacity: 1; }
        .ac-top-bar {
          height: 2px; background: linear-gradient(90deg, #c8a96e, transparent);
          transform-origin: left; transform: scaleX(0);
          transition: transform 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        .ac-card:hover .ac-top-bar { transform: scaleX(1); }
        .ac-body { padding: 1.5rem 1.75rem 1.25rem; flex: 1; display: flex; flex-direction: column; }
        .ac-journal {
          font-size: 0.6rem; font-weight: 500; letter-spacing: 0.2em;
          text-transform: uppercase; color: #c8a96e;
          margin-bottom: 1rem; display: flex; align-items: center; gap: 0.6rem;
        }
        .ac-journal::after { content: ''; flex: 1; height: 1px; background: #2a2520; }
        .ac-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.15rem; font-weight: 600; line-height: 1.35;
          color: #f0ebe0; margin-bottom: 0.875rem; flex: 1;
        }
        .ac-abstract {
          font-size: 0.78rem; line-height: 1.75; color: #6b6358; font-weight: 300;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
          overflow: hidden; margin-bottom: 1.25rem;
        }
        .ac-footer {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.875rem 1.75rem; border-top: 1px solid #1e1b17;
        }
        .ac-date { font-size: 0.65rem; font-weight: 400; letter-spacing: 0.06em; color: #4a4540; }
        .ac-link {
          font-size: 0.65rem; font-weight: 500; letter-spacing: 0.15em;
          text-transform: uppercase; color: #c8a96e; text-decoration: none;
          display: flex; align-items: center; gap: 0.4rem;
          transition: gap 0.2s ease, color 0.2s ease;
        }
        .ac-link:hover { color: #e8c98e; gap: 0.7rem; }

        /* AI SUMMARY */
        .ac-summary {
          margin-bottom: 1rem; padding: 0.875rem 1rem;
          border: 1px solid #2a2520; border-left: 2px solid #c8a96e;
          background: rgba(200,169,110,0.04);
          animation: fadeUp 0.3s ease both;
        }
        .ac-summary-label {
          font-size: 0.55rem; font-weight: 500;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: #c8a96e; margin-bottom: 0.5rem;
        }
        .ac-summary-text { font-size: 0.8rem; line-height: 1.7; color: #a09880; font-weight: 300; }
        .ac-summary-error { font-size: 0.75rem; color: #6b4040; margin-bottom: 0.75rem; font-style: italic; }
        .ac-summarise-btn {
          align-self: flex-start; background: transparent;
          border: 1px solid #2a2520; padding: 6px 14px; cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-size: 0.6rem; font-weight: 500;
          letter-spacing: 0.15em; text-transform: uppercase; color: #6b6358;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
          margin-top: 0.5rem; display: flex; align-items: center; gap: 0.4rem;
        }
        .ac-summarise-btn:hover:not(:disabled) { border-color: #c8a96e; color: #c8a96e; background: rgba(200,169,110,0.04); }
        .ac-summarise-btn.active { border-color: #3a3028; color: #4a4540; }
        .ac-summarise-btn.loading { opacity: 0.6; cursor: not-allowed; }
        .ac-summarise-btn:disabled { cursor: not-allowed; }
        .ac-spinner {
          display: inline-block; width: 10px; height: 10px;
          border: 1.5px solid #4a4540; border-top-color: #c8a96e;
          border-radius: 50%; animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* PAGINATION */
        .pagination {
          max-width: 1200px; margin: 0 auto; padding: 2rem 2rem 6rem;
          display: flex; align-items: center; justify-content: space-between;
          border-top: 1px solid var(--border);
        }
        .pagination-info { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
        .pagination-controls { display: flex; align-items: center; gap: 1rem; }
        .pagination-btn {
          font-family: 'Outfit', sans-serif; font-size: 0.65rem; font-weight: 500;
          letter-spacing: 0.15em; text-transform: uppercase;
          color: var(--gold); text-decoration: none;
          border: 1px solid var(--ink-faint); padding: 8px 20px;
          transition: border-color 0.2s ease, background 0.2s ease; display: inline-block;
        }
        .pagination-btn:hover { border-color: var(--gold); background: rgba(200,169,110,0.06); }
        .pagination-btn.disabled { color: var(--ink-faint); border-color: var(--ink-faint); pointer-events: none; opacity: 0.4; }
        .pagination-pages { display: flex; align-items: center; gap: 0.5rem; }
        .pagination-page {
          font-size: 0.65rem; font-weight: 500; letter-spacing: 0.1em;
          color: var(--ink-dim); text-decoration: none;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          border: 1px solid transparent; transition: border-color 0.2s ease, color 0.2s ease;
        }
        .pagination-page:hover { color: var(--gold); border-color: var(--ink-faint); }
        .pagination-page.active { color: var(--gold); border-color: var(--gold); background: rgba(200,169,110,0.06); }
        .pagination-ellipsis { color: var(--ink-faint); font-size: 0.65rem; padding: 0 4px; }

        /* FOOTER */
        .footer { position: relative; z-index: 1; border-top: 1px solid var(--border); }
        .footer-inner { max-width: 1200px; margin: 0 auto; padding: 2rem; display: flex; align-items: center; justify-content: space-between; }
        .footer-brand { font-family: 'Cormorant Garamond', serif; font-size: 1rem; font-weight: 700; font-style: italic; color: var(--ink-dim); }
        .footer-copy { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-faint); }
        .footer-disclaimer {
          max-width: 1200px; margin: 0 auto; padding: 0 2rem 1.5rem;
          font-size: 0.58rem; line-height: 1.8; color: var(--ink-faint);
          letter-spacing: 0.04em; border-top: 1px solid #111;
        }
      `}</style>

      <nav className="nav">
        <div className="nav-inner">
          <a href="/" className="nav-brand">
            <span className="nav-brand-name">Bite&#8209;Sized Club</span>
            <span className="nav-brand-dot" />
          </a>
          <div className="nav-right">
            <span className="nav-date">{today}</span>

            {/* JOURNAL DROPDOWN */}
            {!fetchError && journals.length > 0 && (
              <div className="journal-select-wrap">
                <select
                  className="journal-select"
                  defaultValue={selectedJournal}
                  onChange={undefined}
                  id="journal-select"
                  name="journal"
                >
                  <option value="">All Journals</option>
                  {journals.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
                <span className="journal-select-arrow">&#9660;</span>
                {/* JS to navigate on change */}
                <script dangerouslySetInnerHTML={{ __html: `
                  document.getElementById('journal-select').addEventListener('change', function() {
                    const val = this.value;
                    const url = new URL(window.location.href);
                    url.searchParams.delete('page');
                    if (val) { url.searchParams.set('journal', val); }
                    else { url.searchParams.delete('journal'); }
                    window.location.href = url.toString();
                  });
                `}} />
              </div>
            )}

            {!fetchError && (
              <span className="nav-pill">{totalCount} Articles</span>
            )}
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-rule-gold" />
        <p className="hero-label">Medical Research Feed</p>
        <h1 className="hero-title">
          Recent<br />
          <em>Publications</em>
        </h1>
        <div className="hero-bottom">
          <p className="hero-desc">
            Automated feed of high-impact open access medical research,
            curated from leading peer-reviewed journals.
          </p>
          {!fetchError && totalCount > 0 && (
            <div className="hero-stat">
              <div className="hero-stat-num">{totalCount}</div>
              <div className="hero-stat-label">
                {selectedJournal ? "In Journal" : query ? "Results Found" : "Total Papers"}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="search-section">
        <form method="GET" action="/" className="search-form">
          {selectedJournal && <input type="hidden" name="journal" value={selectedJournal} />}
          <input
            className="search-input"
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search by title, abstract, or journal..."
            autoComplete="off"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        {(query || selectedJournal) && (
          <div className="search-meta">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {query && (
                <p className="search-results-label">
                  <strong>{totalCount}</strong> result{totalCount !== 1 ? "s" : ""} for{" "}
                  <strong>&ldquo;{query}&rdquo;</strong>
                </p>
              )}
              {selectedJournal && (
                <span className="journal-badge">
                  {selectedJournal}
                  <a href={query ? `/?q=${encodeURIComponent(query)}` : "/"}>&#10005;</a>
                </span>
              )}
            </div>
            <a href="/" className="search-clear">&#215; Clear all</a>
          </div>
        )}
      </div>

      <div className="section-divider">
        <div className="section-divider-bar">
          <span className="section-divider-label">
            {selectedJournal ? selectedJournal : query ? "Search Results" : `Page ${currentPage} of ${totalPages}`}
          </span>
          <div className="section-divider-line" />
        </div>
      </div>

      <main className="grid-section">
        <div className="articles-grid">
          {fetchError ? (
            <ErrorState />
          ) : articles.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                highlightJournal={selectedJournal}
              />
            ))
          )}
        </div>
      </main>

      {!fetchError && totalPages > 1 && (
        <div className="pagination">
          <span className="pagination-info">
            {offset + 1}&#8211;{Math.min(offset + PAGE_SIZE, totalCount)} of {totalCount}
          </span>
          <div className="pagination-controls">
            <a
              href={buildUrl({ page: currentPage - 1 })}
              className={`pagination-btn${currentPage <= 1 ? " disabled" : ""}`}
            >
              &#8592; Prev
            </a>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`e${i}`} className="pagination-ellipsis">&#8230;</span>
                  ) : (
                    <a
                      key={p}
                      href={buildUrl({ page: p as number })}
                      className={`pagination-page${p === currentPage ? " active" : ""}`}
                    >
                      {p}
                    </a>
                  )
                )}
            </div>
            <a
              href={buildUrl({ page: currentPage + 1 })}
              className={`pagination-btn${currentPage >= totalPages ? " disabled" : ""}`}
            >
              Next &#8594;
            </a>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">Bite&#8209;Sized Club</span>
          <span className="footer-copy">Open Access &#183; Medical Research</span>
        </div>
        <div className="footer-disclaimer">
          All article titles, abstracts, and metadata belong to their respective publishers and authors.
          This site links to original sources and is intended for personal and educational use only.
          AI summaries are generated automatically and may not be fully accurate.
        </div>
      </footer>
    </>
  );
}

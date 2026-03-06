import { getDb } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SaveButton from "@/components/SaveButton";

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const sql = getDb();

  try {
    const articles = await sql`
      SELECT * FROM "Article" WHERE id = ${id}
    `;

    if (articles.length === 0) {
      notFound();
    }

    const article = articles[0];

    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Outfit:wght@200;300;400;500&display=swap');
          
          body { background: #080807; color: #f0ebe0; font-family: 'Outfit', sans-serif; }
          
          .article-container { max-width: 900px; margin: 0 auto; padding: 3rem 2rem; }
          .article-header { margin-bottom: 3rem; padding-bottom: 2rem; border-bottom: 1px solid #1e1c18; }
          .article-journal { font-size: 0.75rem; letter-spacing: 0.2em; text-transform: uppercase; color: #c8a96e; margin-bottom: 1rem; }
          .article-title { font-family: 'Cormorant Garamond', serif; font-size: 2.5rem; font-weight: 600; line-height: 1.2; color: #f0ebe0; margin-bottom: 1.5rem; }
          .article-meta { display: flex; gap: 2rem; flex-wrap: wrap; margin-bottom: 2rem; font-size: 0.85rem; color: #a09880; }
          .article-meta-item { display: flex; flex-direction: column; }
          .article-meta-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6b6358; margin-bottom: 0.25rem; }
          .article-actions { display: flex; gap: 1rem; margin-bottom: 2rem; }
          .article-content { font-size: 1rem; line-height: 1.8; color: #f0ebe0; }
          .section { margin-bottom: 2.5rem; }
          .section-title { font-family: 'Cormorant Garamond', serif; font-size: 1.5rem; font-weight: 600; color: #c8a96e; margin-bottom: 1rem; }
          .section-content { color: #a09880; line-height: 1.8; }
          .back-link { display: inline-block; margin-bottom: 2rem; color: #c8a96e; text-decoration: none; font-size: 0.9rem; }
          .back-link:hover { color: #e8c98e; }
          .button-primary { background: #c8a96e; color: #080807; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; text-decoration: none; display: inline-block; transition: background 0.2s; }
          .button-primary:hover { background: #e8c98e; }
        `}</style>

        <div className="article-container">
          <a href="/" className="back-link">← Back to articles</a>

          <div className="article-header">
            <div className="article-journal">{article.journalName}</div>
            <h1 className="article-title">{article.title}</h1>

            <div className="article-meta">
              <div className="article-meta-item">
                <span className="article-meta-label">Published</span>
                <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
              </div>
              {article.authors && (
                <div className="article-meta-item">
                  <span className="article-meta-label">Authors</span>
                  <span>{article.authors}</span>
                </div>
              )}
              {article.pmid && (
                <div className="article-meta-item">
                  <span className="article-meta-label">PMID</span>
                  <span>{article.pmid}</span>
                </div>
              )}
            </div>

            <div className="article-actions">
              <SaveButton articleId={article.id} />
              {article.doi && (
                <a
                  href={`https://doi.org/${article.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary"
                >
                  View Original Paper
                </a>
              )}
              {article.pmid && (
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-primary"
                >
                  PubMed Link
                </a>
              )}
            </div>
          </div>

          <div className="article-content">
            {article.originalAbstract && (
              <div className="section">
                <h2 className="section-title">Abstract</h2>
                <div className="section-content">
                  {article.originalAbstract}
                </div>
              </div>
            )}

            {article.aiSummary && (
              <div className="section">
                <h2 className="section-title">AI Summary</h2>
                <div className="section-content">
                  {article.aiSummary}
                </div>
              </div>
            )}

            {!article.originalAbstract && !article.aiSummary && (
              <div className="section">
                <p className="section-content">
                  Full article details available at the source.
                </p>
              </div>
            )}

            <div className="section">
              <h2 className="section-title">Citation</h2>
              <div className="section-content" style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>
                {article.journalName}. {new Date(article.publishedAt).getFullYear()}. {article.title}
                {article.authors && ` Authors: ${article.authors}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching article:", error);
    notFound();
  }
}

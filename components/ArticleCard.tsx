"use client";
// components/ArticleCard.tsx
import { useState } from "react";
import SaveButton from "./SaveButton";

export default function ArticleCard({
  article,
  highlightJournal = "",
}: {
  article: any;
  highlightJournal?: string;
}) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isHighlighted = highlightJournal
    ? article.journalName === highlightJournal
    : false;

  async function handleSummarise() {
    if (summary) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          abstract: article.originalAbstract,
          url: article.url,
          journal: article.journalName,
          doi: article.doi,
          pmid: article.pmid,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`ac-card${isHighlighted ? " ac-highlighted" : ""}`}>
      <div className="ac-glow" />
      <div className="ac-top-bar" />
      <div className="ac-body">
        <div className="ac-journal">{article.journalName}</div>
        <h2 className="ac-title">{article.title}</h2>
        <p className="ac-abstract">{article.originalAbstract}</p>

        {summary && (
          <div className="ac-summary">
            <div className="ac-summary-label">&#10024; Plain English</div>
            <p className="ac-summary-text">{summary}</p>
          </div>
        )}

        {error && (
          <div className="ac-summary-error">Could not generate summary. Try again.</div>
        )}

        <button
          onClick={handleSummarise}
          disabled={loading}
          className={`ac-summarise-btn${loading ? " loading" : ""}${summary ? " active" : ""}`}
        >
          {loading ? (
            <span className="ac-spinner" />
          ) : summary ? (
            <>&#10005; Hide Summary</>
          ) : (
            <>&#10024; Summarise</>
          )}
        </button>
      </div>

      <div className="ac-footer">
        <span className="ac-date">{formattedDate}</span>
        <SaveButton articleId={article.id} />
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="ac-link">
          Read Paper &#8594;
        </a>
      </div>
    </div>
  );
}

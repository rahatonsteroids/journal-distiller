"use client";

import { useState } from "react";

type SummarisePayload = {
  title: string;
  abstract: string;
  url: string;
  journal: string;
  doi?: string | null;
  pmid?: string | null;
};

export default function SummariseButton({ payload }: { payload: SummarisePayload }) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSummarise() {
    if (summary) {
      setSummary("");
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { summary?: string; error?: string };

      if (!res.ok || !data.summary) {
        setError(data.error || "Could not generate summary right now.");
        return;
      }

      setSummary(data.summary);
    } catch {
      setError("Network error while requesting summary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleSummarise}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md bg-[#136dec] px-2 py-1 text-[10px] font-bold text-white disabled:opacity-70"
      >
        <span className="material-symbols-outlined text-[14px]">
          {loading ? "hourglass_top" : summary ? "close" : "auto_awesome"}
        </span>
        <span>{loading ? "Working..." : summary ? "Hide Summary" : "AI Summary"}</span>
      </button>

      {summary && <p className="mt-2 text-xs text-slate-700">{summary}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

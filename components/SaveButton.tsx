"use client";

import { useState } from "react";

export default function SaveButton({
  articleId,
  variant = "default",
}: {
  articleId: number | string;
  variant?: "default" | "tag";
}) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    try {
      const res = await fetch("/api/saved-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: String(articleId) }),
      });

      const data = (await res.json()) as { error?: string };

      if (res.ok || data.error === "Article already saved") {
        setSaved(true);
        return;
      }

      if (data.error === "Not authenticated") {
        window.location.href = "/auth/login";
      }
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setLoading(false);
    }
  }

  const defaultClass = saved
    ? "bg-green-600 text-white cursor-not-allowed"
    : "bg-yellow-500 hover:bg-yellow-400 text-black";

  const tagClass = saved
    ? "border-green-300 bg-green-50 text-green-700 cursor-not-allowed"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button
      onClick={handleSave}
      disabled={saved || loading}
      className={`rounded px-3 py-1.5 text-xs font-semibold transition ${
        variant === "tag" ? tagClass : defaultClass
      }`}
    >
      {saved ? "Saved" : loading ? "Saving..." : variant === "tag" ? "Save" : "Save Article"}
    </button>
  );
}

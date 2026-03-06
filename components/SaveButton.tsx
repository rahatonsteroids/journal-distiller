"use client";

import { useState } from "react";

export default function SaveButton({ articleId }: { articleId: number }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);

    try {
      const res = await fetch("/api/saved-articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId }),
      });

      if (res.ok) {
        setSaved(true);
        alert("Article saved to your profile!");
      } else {
        const data = await res.json();
        if (data.error === "Not authenticated") {
          alert("Please login to save articles");
          window.location.href = "/auth/login";
        } else {
          alert(data.error || "Failed to save");
        }
      }
    } catch (error) {
      alert("Error saving article");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saved || loading}
      className={`px-4 py-2 rounded text-sm font-semibold transition ${
        saved
          ? "bg-green-600 text-white cursor-not-allowed"
          : "bg-yellow-500 hover:bg-yellow-400 text-black"
      }`}
    >
      {saved ? "✓ Saved" : loading ? "Saving..." : "Save Article"}
    </button>
  );
}
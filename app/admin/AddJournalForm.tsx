"use client";

import { useState } from "react";

export default function AddJournalForm() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name");
    const url = formData.get("url");

    await fetch("/api/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url }),
    });

    setLoading(false);
    window.location.reload();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex gap-12 items-end"
    >
      {/* Journal Name */}
      <div className="flex flex-col">
        <label className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
          Journal Name
        </label>
        <input
          name="name"
          required
          className="bg-transparent border-b border-zinc-700 pb-2 focus:outline-none focus:border-yellow-600 transition w-64"
        />
      </div>

      {/* Journal URL */}
      <div className="flex flex-col">
        <label className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
          Journal URL
        </label>
        <input
          name="url"
          required
          className="bg-transparent border-b border-zinc-700 pb-2 focus:outline-none focus:border-yellow-600 transition w-80"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="text-yellow-600 uppercase tracking-widest text-sm hover:opacity-70 transition"
      >
        {loading ? "Adding..." : "Add"}
      </button>
    </form>
  );
}
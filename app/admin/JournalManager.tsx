"use client";

import { useMemo, useState } from "react";

interface Journal {
  id: number;
  name: string;
  url: string;
}

export default function JournalManager({ journals: initialJournals }: { journals: Journal[] }) {
  const [journals, setJournals] = useState<Journal[]>([...initialJournals]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null); 

  const deletingJournal = useMemo(
    () => journals.find((journal) => journal.id === deleteId) ?? null,
    [deleteId, journals]
  );

  async function addJournal() {
    if (!name.trim() || !url.trim()) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });
      const payload = (await res.json()) as { id?: number; name?: string; url?: string; error?: string };

      if (!res.ok || !payload.id) {
        setError(payload.error || "Failed to add journal.");
        return;
      }

      setJournals((prev) => [{ id: payload.id!, name: payload.name ?? name.trim(), url: payload.url ?? url.trim() }, ...prev]);
      setName("");
      setUrl("");
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`/api/journals/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setJournals((prev) => prev.filter((j) => j.id !== deleteId));
        setDeleteId(null);
      } else {
        const payload = (await res.json()) as { error?: string };
        setError(payload.error || "Failed to delete journal.");
      }
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(journal: Journal) {
    setEditingId(journal.id);
    setEditName(journal.name);
    setEditUrl(journal.url);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditUrl("");
  }

  async function saveEdit(id: number) {
    if (!editName.trim() || !editUrl.trim()) return;
    setBusy(true);
    setError("");

    try {
      const res = await fetch(`/api/journals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), url: editUrl.trim() }),
      });
      const payload = (await res.json()) as { id?: number; name?: string; url?: string; error?: string };

      if (!res.ok || !payload.id) {
        setError(payload.error || "Failed to update journal.");
        return;
      }

      setJournals((prev) =>
        prev.map((j) =>
          j.id === id
            ? { id: payload.id!, name: payload.name ?? editName.trim(), url: payload.url ?? editUrl.trim() }
            : j
        )
      );
      cancelEdit();
    } catch (error) {
      setError(String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Manage Journals</h2>
        <span className="text-xs font-semibold text-slate-500">{journals.length} journals</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Journal Name"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#136dec]"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#136dec]"
        />
        <button
          onClick={addJournal}
          disabled={busy}
          className="rounded-lg bg-[#136dec] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
        >
          {busy ? "Saving..." : "Add Journal"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-5 space-y-2">
        {journals.map((journal) => (
          <div key={journal.id} className="rounded-xl border border-slate-200 p-3">
            {editingId === journal.id ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#136dec]"
                />
                <input
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#136dec]"
                />
                <button
                  onClick={() => saveEdit(journal.id)}
                  disabled={busy}
                  className="rounded-lg bg-[#136dec] px-3 py-2 text-xs font-semibold text-white disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{journal.name}</p>
                  <p className="text-xs text-slate-500">{journal.url}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(journal)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(journal.id)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {journals.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            No journals added yet.
          </div>
        )}
      </div>

      {deletingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Delete journal?</h3>
            <p className="mt-1 text-sm text-slate-600">{deletingJournal.name}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-70"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

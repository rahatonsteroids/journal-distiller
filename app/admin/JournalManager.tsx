"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Journal {
  id: number;
  name: string;
  url: string;
}

export default function JournalManager({ journals: initialJournals }: { journals: Journal[] }) {
  const [journals, setJournals] = useState<Journal[]>(initialJournals);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch journals on mount
  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch("/api/journals");
        if (res.ok) {
          const data = await res.json();
          setJournals(data);
        }
      } catch (error) {
        console.error("Error fetching journals:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchJournals();
  }, []);

  async function addJournal() {
    if (!name || !url) return;

    try {
      const res = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });

      if (res.ok) {
        const newJournal = await res.json();
        setJournals([newJournal, ...journals]);
        setName("");
        setUrl("");
      } else {
        const error = await res.json();
        alert("Error adding journal: " + error.error);
      }
    } catch (error) {
      alert("Error: " + String(error));
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/journals/${deleteId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setJournals(journals.filter((j) => j.id !== deleteId));
        setDeleteId(null);
      } else {
        alert("Error deleting journal");
      }
    } catch (error) {
      alert("Error: " + String(error));
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
    try {
      const res = await fetch(`/api/journals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, url: editUrl }),
      });

      if (res.ok) {
        const updated = await res.json();
        setJournals(journals.map((j) => (j.id === id ? updated : j)));
        cancelEdit();
      } else {
        alert("Error updating journal");
      }
    } catch (error) {
      alert("Error: " + String(error));
    }
  }

  if (loading) return <div className="text-zinc-400">Loading journals...</div>;

  return (
    <div className="space-y-16">
      <div>
        <h2 className="text-zinc-400 uppercase tracking-widest text-sm mb-6">
          Manage Journals
        </h2>
        <div className="flex gap-10 items-end">
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Journal Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-transparent border-b border-zinc-700 focus:outline-none w-64 py-2"
              placeholder="e.g., The Lancet"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Journal URL
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-transparent border-b border-zinc-700 focus:outline-none w-64 py-2"
              placeholder="e.g., https://www.thelancet.com/"
            />
          </div>
          <button
            onClick={addJournal}
            className="text-yellow-500 hover:text-yellow-400 uppercase tracking-wider text-sm"
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <AnimatePresence>
          {journals.map((journal) => (
            <motion.div
              key={journal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="border-b border-zinc-800 py-6 flex justify-between items-center"
            >
              {editingId === journal.id ? (
                <div className="flex gap-6 items-center w-full">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-transparent border-b border-zinc-700 focus:outline-none py-1 w-48"
                  />
                  <input
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="bg-transparent border-b border-zinc-700 focus:outline-none py-1 w-64"
                  />
                  <button
                    onClick={() => saveEdit(journal.id)}
                    className="text-green-500 uppercase text-xs"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-zinc-500 uppercase text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xl font-medium">{journal.name}</h3>
                    <p className="text-zinc-500 text-sm">{journal.url}</p>
                  </div>
                  <div className="flex gap-6">
                    <button
                      onClick={() => startEdit(journal)}
                      className="text-blue-500 uppercase tracking-wider text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteId(journal.id)}
                      className="text-red-500 uppercase tracking-wider text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-zinc-900 p-8 rounded-lg w-96 border border-zinc-800"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <h3 className="text-lg mb-4">Delete this journal?</h3>
              <div className="flex justify-end gap-6 mt-6">
                <button
                  onClick={() => setDeleteId(null)}
                  className="text-zinc-400 uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="text-red-500 uppercase text-xs"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SavedArticle {
  id: number;
  user_id: number;
  article_id: number;
  title: string;
  journalName: string;
  savedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        
        setEmail(data.email);
        setSavedArticles(data.savedArticles || []);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  async function removeSavedArticle(id: number) {
    try {
      const res = await fetch(`/api/saved-articles/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setSavedArticles(savedArticles.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Error removing article:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b2a66] text-white flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b2a66] text-white">
      <div className="max-w-1200 mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-white/80 mt-2">{email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded"
          >
            Logout
          </button>
        </div>

        <div className="bg-[#0f347a] p-6 rounded-lg border border-[#2a5fbf]">
          <h2 className="text-2xl font-bold mb-6">Saved Articles</h2>

          {savedArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/80 mb-4">No saved articles yet</p>
              <Link href="/" className="text-white hover:text-white/80 underline">
                Browse articles and save your favorites
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {savedArticles.map((article) => (
                <div
                  key={article.id}
                  className="border border-[#2a5fbf] bg-[#0b2a66] p-4 rounded flex justify-between items-start"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">
                      {article.title}
                    </h3>
                    <p className="text-white/80 text-sm mb-2">
                      {article.journalName}
                    </p>
                    <p className="text-white/70 text-xs">
                      Saved on{" "}
                      {new Date(article.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => removeSavedArticle(article.id)}
                    className="text-red-500 hover:text-red-400 ml-4 whitespace-nowrap"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

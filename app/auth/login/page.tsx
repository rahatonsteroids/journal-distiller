"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const msg = searchParams.get("message");
    if (msg) setMessage(msg);
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/profile");
      } else {
        const data = await res.json();
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-zinc-900 p-10 rounded-lg border border-zinc-800 w-96"
      >
        <h1 className="text-2xl mb-6">User Login</h1>

        {message && <p className="text-green-500 text-sm mb-4">{message}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full mb-4 p-2 bg-zinc-800 border border-zinc-700 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full mb-4 p-2 bg-zinc-800 border border-zinc-700 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 text-black py-2 rounded hover:bg-yellow-400 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-zinc-400 mt-4">
          Don't have an account?{" "}
          <a href="/auth/signup" className="text-yellow-500 hover:text-yellow-400">
            Sign Up
          </a>
        </p>
      </form>
    </div>
  );
}
"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  return (
    <button
      onClick={handleLogout}
      className="border border-zinc-700 px-6 py-2 text-sm uppercase tracking-widest hover:bg-zinc-900 transition"
    >
      Logout
    </button>
  );
}
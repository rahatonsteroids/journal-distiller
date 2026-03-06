import Link from 'next/link';

export default function SavedPage() {
  return (
    <main className="min-h-screen bg-[#0b2a66] p-6 text-white">
      <h1 className="text-2xl font-bold">Saved</h1>
      <p className="mt-2 text-sm text-white/85">
        Your saved summaries will appear here.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-white hover:underline">
        Back to Home
      </Link>
    </main>
  );
}

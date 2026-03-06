import Link from 'next/link';

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-[#0b2a66] p-6 text-white">
      <h1 className="text-2xl font-bold">Discover</h1>
      <p className="mt-2 text-sm text-white/85">
        Discover features are coming soon.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-white hover:underline">
        Back to Home
      </Link>
    </main>
  );
}

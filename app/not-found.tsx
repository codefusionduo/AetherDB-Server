import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold mb-2">404 - Page Not Found</h2>
      <p className="text-zinc-400 text-sm mb-4">The requested AetherDB resource could not be found.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
      >
        Return to AetherDB Console
      </Link>
    </div>
  );
}

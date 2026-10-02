import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <h2 className="text-xl font-bold font-mono text-emerald-400">404 - Page Not Found</h2>
      <p className="text-xs text-zinc-400 mt-2">The requested database route does not exist.</p>
      <Link href="/" className="mt-4 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs rounded text-zinc-200">
        Return to Server Studio
      </Link>
    </div>
  );
}

// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold">Welcome to DORA Metrics Dashboard</h1>
      <Link
        href="/dashboard"
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}

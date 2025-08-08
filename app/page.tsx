export const runtime = "edge";

export default function HomePage() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">FoundrCheck</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/submit" className="underline">Submit</a>
          <a href="/leaderboard" className="underline">Leaderboard</a>
          <a href="/profile" className="underline">Profile</a>
        </nav>
      </header>
      <section>
        <h2 className="text-xl font-medium mb-2">Best Idea of the Day</h2>
        <div className="border rounded p-4">Coming soon</div>
      </section>
    </main>
  );
}



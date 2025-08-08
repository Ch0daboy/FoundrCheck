export const runtime = "edge";

type MyIdea = { id: string; title: string; status: string; score?: number | null };

async function getData(): Promise<MyIdea[]> {
  const res = await fetch("/api/me/ideas", { cache: "no-store" } as any);
  if (!res.ok) return [] as MyIdea[];
  return (await res.json()) as MyIdea[];
}

export default async function ProfilePage() {
  const ideas = await getData();
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Your Ideas</h1>
      <ul className="space-y-3">
        {ideas.map((i: any) => (
          <li key={i.id} className="border rounded p-3">
            <div className="flex justify-between">
              <a className="underline" href={`/ideas/${i.id}`}>{i.title}</a>
              <span className="text-xs uppercase">{i.status}</span>
            </div>
            {i.score != null && (
              <div className="text-sm mt-1">Score: {i.score}</div>
            )}
          </li>
        ))}
        {!ideas.length && <p>No ideas yet.</p>}
      </ul>
    </main>
  );
}



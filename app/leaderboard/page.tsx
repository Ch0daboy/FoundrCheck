export const runtime = "edge";

type Row = { id: string; title: string; score: number; analysis_summary: string | null; created_at: string };

async function getData(): Promise<Row[]> {
  const res = await fetch("/api/leaderboard", { cache: "no-store" } as any);
  return (await res.json()) as Row[];
}

export default async function LeaderboardPage() {
  const rows = await getData();
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Leaderboard</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Rank</th>
              <th>Title</th>
              <th>Score</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any, i: number) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{i + 1}</td>
                <td><a className="underline" href={`/ideas/${r.id}`}>{r.title}</a></td>
                <td>{r.score}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}



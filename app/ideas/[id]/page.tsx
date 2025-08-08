export const runtime = "edge";

type Idea = {
  id: string;
  title: string;
  score?: number | null;
  analysis_summary?: string | null;
  analysis_raw?: string | null;
  created_at: string;
};

async function getData(id: string): Promise<Idea> {
  const res = await fetch(`/api/ideas/${id}`, { cache: "no-store" } as any);
  return (await res.json()) as Idea;
}

export default async function IdeaDetail({ params }: { params: { id: string } }) {
  const idea = await getData(params.id);
  return (
    <main className="max-w-3xl mx-auto p-6">
      <a href="/" className="underline text-sm">← Home</a>
      <h1 className="text-2xl font-semibold mt-2 mb-2">{idea.title}</h1>
      {idea.score != null && <div className="mb-2">Score: {idea.score}</div>}
      {idea.analysis_summary && (
        <p className="text-sm whitespace-pre-wrap">{idea.analysis_summary}</p>
      )}
      {idea.analysis_raw && (
        <details className="mt-4">
          <summary>Raw Analysis (JSON)</summary>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{idea.analysis_raw}</pre>
        </details>
      )}
      <div className="text-xs text-gray-600 mt-4">Created: {new Date(idea.created_at).toLocaleString()}</div>
    </main>
  );
}



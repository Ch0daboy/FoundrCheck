"use client";

import { useState } from "react";

export const runtime = "edge";

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const turnstileToken = (window as any).turnstile?.getResponse?.() || "TEST";
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, turnstileToken }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Submit an Idea</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          className="w-full border rounded p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
        <textarea
          className="w-full border rounded p-2 min-h-[200px]"
          placeholder="Describe your idea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
        <button disabled={loading} className="border rounded px-4 py-2">
          {loading ? "Submitting..." : "Submit"}
        </button>
      </form>
      {result && (
        <pre className="mt-6 text-xs bg-gray-100 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  );
}



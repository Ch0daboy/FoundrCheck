"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

export const runtime = "edge";

export default function SubmitPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Please complete the Turnstile verification");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (description.length < 20) {
      setError("Description must be at least 20 characters");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, turnstileToken }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Submit an Idea</h1>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title
          </label>
          <input
            id="title"
            className="w-full border rounded p-2"
            placeholder="Your idea title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mt-1">
            {title.length}/120 characters
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            className="w-full border rounded p-2 min-h-[200px]"
            placeholder="Describe your startup idea in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            disabled={loading}
          />
          <div className="text-xs text-gray-500 mt-1">
            {description.length}/2000 characters (minimum 20)
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Verification
          </label>
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken(null)}
            onExpire={() => setTurnstileToken(null)}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading || !turnstileToken}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Submitting..." : "Submit Idea"}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-medium mb-2">Submission Result</h3>
          <pre className="text-xs bg-white p-3 rounded overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}



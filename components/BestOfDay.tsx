import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Lazy-load client-only ScoreBadge similar to IdeaCard pattern
const ScoreBadge = dynamic(() => import("./ScoreBadge").then(mod => ({ default: mod.ScoreBadge })), {
  loading: () => <Badge className="bg-gray-100 text-gray-800">...</Badge>,
  ssr: false,
});

type BestRow = {
  id: string;
  title: string;
  score: number | null;
  analysis_summary: string | null;
  created_at: string;
} | null;

async function getBestOfDay(): Promise<BestRow> {
  try {
    const res = await fetch("/api/best-of-day", { cache: "no-store" } as any);
    // If API fails, surface as null to render a graceful empty state
    if (!res.ok) return null;
    return (await res.json()) as BestRow;
  } catch {
    return null;
  }
}

export async function BestOfDay() {
  const data = await getBestOfDay();

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No top idea yet today</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No scored ideas in Los Angeles time today. Be the first —
            <a href="/submit" className="underline ml-1">submit an idea</a>.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { id, title, score, analysis_summary, created_at } = data;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-lg leading-tight">
            <a href={`/ideas/${id}`} className="hover:underline">{title}</a>
          </CardTitle>
          {typeof score === "number" && (
            <Suspense fallback={<Badge className="bg-gray-100 text-gray-800">...</Badge>}>
              <ScoreBadge score={score} />
            </Suspense>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {analysis_summary && (
          <p className="text-sm text-muted-foreground mb-3">{analysis_summary}</p>
        )}
        <div className="text-xs text-muted-foreground">
          {new Date(created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}

export function BestOfDaySkeleton() {
  return (
    <div className="border rounded p-4 animate-pulse space-y-3">
      <div className="flex justify-between items-start">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-6 w-12 bg-gray-200 rounded" />
      </div>
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-3 bg-gray-200 rounded w-24" />
    </div>
  );
}


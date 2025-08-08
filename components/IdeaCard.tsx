import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import ScoreBadge to reduce initial bundle size
const ScoreBadge = dynamic(() => import("./ScoreBadge").then(mod => ({ default: mod.ScoreBadge })), {
  loading: () => <Badge className="bg-gray-100 text-gray-800">...</Badge>,
  ssr: false
});

interface IdeaCardProps {
  id: string;
  title: string;
  description: string;
  score?: number;
  analysis_summary?: string | null;
  status: string;
  created_at: string;
  isOwner?: boolean;
}

export function IdeaCard({ 
  id, 
  title, 
  description, 
  score, 
  analysis_summary, 
  status, 
  created_at,
  isOwner = false 
}: IdeaCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scored': return 'default';
      case 'queued': return 'secondary';
      case 'analyzing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">
              <a href={`/ideas/${id}`} className="hover:underline">
                {title}
              </a>
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">
              {description}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2 ml-4">
            {score !== undefined && (
              <Suspense fallback={<Badge className="bg-gray-100 text-gray-800">...</Badge>}>
                <ScoreBadge score={score} />
              </Suspense>
            )}
            <Badge variant={getStatusColor(status)}>
              {status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {analysis_summary && (
          <p className="text-sm text-muted-foreground mb-3">
            {analysis_summary}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(created_at).toLocaleDateString()}</span>
          {isOwner && <span>Your idea</span>}
        </div>
      </CardContent>
    </Card>
  );
}

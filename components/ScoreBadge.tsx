import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ScoreBadgeProps {
  score: number;
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (score >= 40) return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const rubricWeights = {
    market_size: "30%",
    novelty: "20%", 
    monetization_clarity: "20%",
    competition_intensity: "15% (inverted)",
    execution_complexity: "15% (inverted)"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={`font-bold text-lg px-3 py-1 ${getScoreColor(score)}`}
          >
            {score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="text-sm">
            <p className="font-semibold mb-2">Scoring Rubric:</p>
            <ul className="space-y-1 text-xs">
              <li>Market Size: {rubricWeights.market_size}</li>
              <li>Novelty: {rubricWeights.novelty}</li>
              <li>Monetization Clarity: {rubricWeights.monetization_clarity}</li>
              <li>Competition Intensity: {rubricWeights.competition_intensity}</li>
              <li>Execution Complexity: {rubricWeights.execution_complexity}</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

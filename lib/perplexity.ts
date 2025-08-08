export type PerplexityRubric = {
  one_sentence: string;
  market_signals: string[];
  competitors: { name: string; brief_note: string }[];
  moat_risks: string[];
  go_to_market: string[];
  monetization: string[];
  feasibility_factors: string[];
  rubric_inputs: {
    market_size: number;
    competition_intensity: number;
    novelty: number;
    execution_complexity: number;
    monetization_clarity: number;
  };
};

export class PerplexityClient {
  private apiKey: string;
  private model: string;
  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  private buildPrompt(userIdea: string): string {
    return `System: You are a rigorous startup idea validator. Be concise, factual, and structured.\n\nUser: Analyze this startup idea and return ONLY a strict JSON object:\n{\n  "one_sentence": "...",\n  "market_signals": ["...","..."],\n  "competitors": [{"name":"...", "brief_note":"..."}],\n  "moat_risks": ["...","..."],\n  "go_to_market": ["...","..."],\n  "monetization": ["...","..."],\n  "feasibility_factors": ["...","..."],\n  "rubric_inputs": {\n    "market_size": 0-5,\n    "competition_intensity": 0-5,\n    "novelty": 0-5,\n    "execution_complexity": 0-5,\n    "monetization_clarity": 0-5\n  }\n}\nIdea: \"\"\"${userIdea}\"\"\"\nReturn ONLY JSON with the exact keys above.`;
  }

  async analyzeIdea(userIdea: string): Promise<PerplexityRubric> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: "You are a rigorous startup idea validator. Be concise, factual, and structured." },
            { role: "user", content: this.buildPrompt(userIdea) },
          ],
          temperature: 0,
        }),
        signal: controller.signal,
      });
      const data = await res.json<any>();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("No content from Perplexity");
      try {
        return JSON.parse(text);
      } catch {
        // Retry once enforcing JSON only
        const res2 = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              { role: "system", content: "You are a rigorous startup idea validator. Respond JSON only, no prose." },
              { role: "user", content: this.buildPrompt(userIdea) },
            ],
            temperature: 0,
          }),
          signal: controller.signal,
        });
        const data2 = await res2.json<any>();
        const text2: string | undefined = data2?.choices?.[0]?.message?.content;
        if (!text2) throw new Error("No content from Perplexity (retry)");
        return JSON.parse(text2);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}



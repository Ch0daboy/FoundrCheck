import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PerplexityClient, type PerplexityRubric } from "./perplexity";

// Utility to create a valid Perplexity-like response
function completion(content: string) {
  return {
    choices: [
      {
        message: { content },
      },
    ],
  };
}

const exampleResult: PerplexityRubric = {
  one_sentence: "Example",
  market_signals: ["signal"],
  competitors: [{ name: "X", brief_note: "note" }],
  moat_risks: ["risk"],
  go_to_market: ["gtm"],
  monetization: ["rev"],
  feasibility_factors: ["feasible"],
  rubric_inputs: {
    market_size: 3,
    competition_intensity: 2,
    novelty: 4,
    execution_complexity: 1,
    monetization_clarity: 3,
  },
};

const json = (obj: any) => ({ ok: true, json: async () => obj });

describe("PerplexityClient.analyzeIdea", () => {
  const client = new PerplexityClient("TEST_KEY", "TEST_MODEL");

  beforeEach(() => {
    vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON when model replies with valid JSON first try", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValueOnce(
      json(completion(JSON.stringify(exampleResult)))
    );

    const res = await client.analyzeIdea("my idea");
    expect(res).toEqual(exampleResult);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries once when first reply is not valid JSON, then succeeds", async () => {
    (fetch as unknown as vi.Mock)
      .mockResolvedValueOnce(json(completion("not json")))
      .mockResolvedValueOnce(json(completion(JSON.stringify(exampleResult))));

    const res = await client.analyzeIdea("my idea");
    expect(res).toEqual(exampleResult);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when no content returned (first call)", async () => {
    (fetch as unknown as vi.Mock).mockResolvedValueOnce(json({ choices: [] }));
    await expect(client.analyzeIdea("x")).rejects.toThrow(/No content/);
  });

  it("throws when both attempts return invalid JSON", async () => {
    (fetch as unknown as vi.Mock)
      .mockResolvedValueOnce(json(completion("not json")))
      .mockResolvedValueOnce(json(completion("also not json")));
    await expect(client.analyzeIdea("x")).rejects.toThrow();
  });
});


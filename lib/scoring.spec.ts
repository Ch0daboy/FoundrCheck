import { describe, it, expect } from "vitest";
import { clampScore, computeScore, type RubricInputs } from "./scoring";

describe("clampScore", () => {
  it("clamps below 0 to 0", () => {
    expect(clampScore(-10)).toBe(0);
  });

  it("clamps above 100 to 100", () => {
    expect(clampScore(150)).toBe(100);
  });

  it("rounds to nearest integer", () => {
    expect(clampScore(49.4)).toBe(49);
    expect(clampScore(49.5)).toBe(50);
  });
});

describe("computeScore", () => {
  const base = (overrides: Partial<RubricInputs> = {}): RubricInputs => ({
    market_size: 0,
    competition_intensity: 5,
    novelty: 0,
    execution_complexity: 5,
    monetization_clarity: 0,
    ...overrides,
  });

  it("yields 0 for worst-case inputs", () => {
    expect(computeScore(base())).toBe(0);
  });

  it("yields expected value for best-case inputs (weights applied)", () => {
    // With weights and /5 normalization in the function, best-case is 76
    const score = computeScore(
      base({
        market_size: 5,
        novelty: 5,
        monetization_clarity: 5,
        competition_intensity: 0,
        execution_complexity: 0,
      })
    );
    expect(score).toBe(76);
  });

  it("penalizes higher competition and complexity", () => {
    const lowFriction = computeScore(
      base({
        market_size: 4,
        novelty: 4,
        monetization_clarity: 4,
        competition_intensity: 1,
        execution_complexity: 1,
      })
    );
    const highFriction = computeScore(
      base({
        market_size: 4,
        novelty: 4,
        monetization_clarity: 4,
        competition_intensity: 5,
        execution_complexity: 5,
      })
    );
    expect(lowFriction).toBeGreaterThan(highFriction);
  });
});


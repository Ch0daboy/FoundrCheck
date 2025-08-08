export type RubricInputs = {
  market_size: number;
  competition_intensity: number;
  novelty: number;
  execution_complexity: number;
  monetization_clarity: number;
};

export function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeScore(inputs: RubricInputs): number {
  const ms = inputs.market_size;
  const ci = inputs.competition_intensity;
  const nov = inputs.novelty;
  const ec = inputs.execution_complexity;
  const mon = inputs.monetization_clarity;

  const final =
    100 *
    (
      0.3 * ms +
      0.2 * nov +
      0.2 * mon +
      0.15 * (5 - ci) / 5 +
      0.15 * (5 - ec) / 5
    ) /
    5;

  return clampScore(final);
}



import { PerplexityClient, type PerplexityRubric } from "../lib/perplexity";
import { computeScore } from "../lib/scoring";

type Env = {
  DB: D1Database;
  PERPLEXITY_API_KEY: string;
  PERPLEXITY_MODEL: string;
};

type IdeaJob = {
  ideaId: string;
  idea_hash: string;
  normalizedText: { title: string; description: string };
};

export default {
  async queue(batch: MessageBatch<IdeaJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        const { ideaId, idea_hash, normalizedText } = msg.body as unknown as IdeaJob;
        const existing = await env.DB.prepare(`SELECT status FROM ideas WHERE id = ?`).bind(ideaId).all();
        const row = existing.results?.[0] as any;
        if (!row || row.status !== "queued") {
          msg.ack();
          continue;
        }

        await env.DB.prepare(`UPDATE ideas SET status='analyzing', updated_at=datetime('now') WHERE id = ?`).bind(ideaId).run();

        // Cache check again (race safety)
        const cache = await env.DB.prepare(
          `SELECT analysis_raw, analysis_summary, score FROM idea_cache WHERE idea_hash = ? AND datetime(cached_at) >= datetime('now', '-72 hours')`
        ).bind(idea_hash).all();
        if (cache.results?.length) {
          const c = cache.results[0] as any;
          await env.DB.prepare(
            `UPDATE ideas SET status='scored', score=?, analysis_summary=?, analysis_raw=?, updated_at=datetime('now') WHERE id = ?`
          ).bind(c.score, c.analysis_summary, c.analysis_raw, ideaId).run();
          msg.ack();
          continue;
        }

        const client = new PerplexityClient(env.PERPLEXITY_API_KEY, env.PERPLEXITY_MODEL);
        const rubric: PerplexityRubric = await client.analyzeIdea(`${normalizedText.title}\n\n${normalizedText.description}`);
        const score = computeScore(rubric.rubric_inputs);
        const topCompetitor = rubric.competitors?.[0]?.name;
        const summaryParts = [
          rubric.one_sentence,
          rubric.market_signals?.[0],
          rubric.market_signals?.[1],
          topCompetitor ? `Top competitor: ${topCompetitor}` : undefined,
          rubric.moat_risks?.[0] ? `Risk: ${rubric.moat_risks[0]}` : undefined,
        ].filter(Boolean);
        const analysis_summary = summaryParts.join(" | ");
        const analysis_raw = JSON.stringify(rubric);

        // Upsert cache
        await env.DB.prepare(
          `INSERT INTO idea_cache (idea_hash, analysis_raw, analysis_summary, score, cached_at) VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(idea_hash) DO UPDATE SET analysis_raw=excluded.analysis_raw, analysis_summary=excluded.analysis_summary, score=excluded.score, cached_at=datetime('now')`
        ).bind(idea_hash, analysis_raw, analysis_summary, score).run();

        await env.DB.prepare(
          `UPDATE ideas SET status='scored', score=?, analysis_summary=?, analysis_raw=?, updated_at=datetime('now') WHERE id = ?`
        ).bind(score, analysis_summary, analysis_raw, ideaId).run();
        msg.ack();
      } catch (err: any) {
        await env.DB.prepare(
          `UPDATE ideas SET status='failed', analysis_summary=?, updated_at=datetime('now') WHERE id = ?`
        ).bind(String(err?.message ?? err), (msg.body as any).ideaId).run();
        msg.ack();
      }
    }
  },
} satisfies ExportedHandler<Env, IdeaJob>;



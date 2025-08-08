/*
  Simple migration runner for D1 using wrangler binding in pages dev/deploy.
  In CI or local, prefer `wrangler d1 execute` via package script.
*/
import { readFile } from "node:fs/promises";

async function main() {
  const sql = await readFile(new URL("../migrations/0001_init.sql", import.meta.url), "utf8");
  // @ts-expect-error using global env in pages runtime
  const db: D1Database = (globalThis as any).DB;
  if (!db) {
    console.log("No DB binding in runtime; use wrangler d1 execute script.");
    return;
  }
  for (const stmt of sql.split(/;\s*\n/).filter(Boolean)) {
    await db.prepare(stmt).run();
  }
  console.log("Migration complete");
}

main();



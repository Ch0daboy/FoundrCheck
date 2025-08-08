export type EnvWithDB = { DB: D1Database };

export async function query<Params extends unknown[]>(env: EnvWithDB, sql: string, params: Params = [] as unknown as Params) {
  const stmt = env.DB.prepare(sql);
  // @ts-expect-error Cloudflare D1 prepare types allow bind variadically
  const bound = params.length ? stmt.bind(...params) : stmt;
  return bound.all();
}

export async function run<Params extends unknown[]>(env: EnvWithDB, sql: string, params: Params = [] as unknown as Params) {
  const stmt = env.DB.prepare(sql);
  // @ts-expect-error variadic bind
  const bound = params.length ? stmt.bind(...params) : stmt;
  return bound.run();
}



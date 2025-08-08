export type EnvWithDB = { DB: D1Database };

export async function query<Params extends unknown[]>(env: EnvWithDB, sql: string, params: Params = [] as unknown as Params) {
  const stmt = env.DB.prepare(sql) as unknown as { bind: (...args: unknown[]) => D1PreparedStatement; all: () => Promise<D1Result> } & D1PreparedStatement;
  const bound = params.length ? (stmt as any).bind(...(params as unknown[])) : stmt;
  return bound.all();
}

export async function run<Params extends unknown[]>(env: EnvWithDB, sql: string, params: Params = [] as unknown as Params) {
  const stmt = env.DB.prepare(sql) as unknown as { bind: (...args: unknown[]) => D1PreparedStatement; run: () => Promise<D1Result> } & D1PreparedStatement;
  const bound = params.length ? (stmt as any).bind(...(params as unknown[])) : stmt;
  return bound.run();
}



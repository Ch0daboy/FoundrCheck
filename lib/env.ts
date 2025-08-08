import { getRequestContext } from "@cloudflare/next-on-pages";

export type Bindings = {
  DB: D1Database;
  IDEA_QUEUE: Queue;
  PERPLEXITY_API_KEY: string;
  PERPLEXITY_MODEL: string;
  APP_TIMEZONE?: string;
  RATE_LIMIT_DAILY?: string | number;
  TURNSTILE_SECRET_KEY?: string;
  NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
};

export function env(): Bindings {
  return getRequestContext().env as unknown as Bindings;
}



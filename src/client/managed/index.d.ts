import type { DbPool } from "./public-api.js";

export interface CreateDbOptions {
  env?: Record<string, string | undefined>;
  endpoint?: string;
  token?: string;
}

export function createDb(options?: CreateDbOptions): Promise<DbPool>;

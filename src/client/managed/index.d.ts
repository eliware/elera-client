import type { DbPool } from "./public-api.js";
import type { LoggerWithConfiguredLevels } from "@eliware/log";

export interface CreateDbOptions {
  env?: Record<string, string | undefined>;
  endpoint?: string;
  token?: string;
  log?: LoggerWithConfiguredLevels;
}

export function createDb(options?: CreateDbOptions): Promise<DbPool>;

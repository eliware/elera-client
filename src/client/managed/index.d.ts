import type { DbPool } from "./public-api.js";
import type { LoggerWithConfiguredLevels } from "@eliware/log";

export interface Telemetry {
  begin?(): unknown;
  record?(value?: Record<string, unknown>): void;
  recordReconnect?(value?: Record<string, unknown>): void;
  snapshot?(): unknown;
  setContext?(value: Record<string, unknown>): void;
  start?(stream: unknown): void;
  stop?(): void;
}

export interface CreateDbOptions {
  env?: Record<string, string | undefined>;
  endpoint?: string;
  token?: string;
  log?: LoggerWithConfiguredLevels;
  fetchImpl?: typeof fetch;
  fetchPath?: string;
  WebSocketImpl?: typeof WebSocket;
  mysqlLib?: typeof import("mysql2/promise");
  routing?: "auto" | "primary" | "balanced";
  quarantineMs?: number;
  drainTimeoutMs?: number;
  now?: () => number;
  telemetry?: boolean | Telemetry;
}

export function createDb(options?: CreateDbOptions): Promise<DbPool>;

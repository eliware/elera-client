import type { PoolConnection, QueryResult } from "mysql2/promise";
export type { PoolConnection, QueryResult } from "mysql2/promise";

export interface ProbeResult {
  ok: true;
  route: "primary" | "balanced";
  result: QueryResult;
  transaction: "started";
  released: true;
}

export interface DbPool {
  query(
    ...args: Parameters<import("mysql2/promise").Pool["query"]>
  ): ReturnType<import("mysql2/promise").Pool["query"]>;
  execute(
    ...args: Parameters<import("mysql2/promise").Pool["execute"]>
  ): ReturnType<import("mysql2/promise").Pool["execute"]>;
  getConnection(): Promise<PoolConnection>;
  probe(sql?: string): Promise<ProbeResult>;
  end(): Promise<void>;
}

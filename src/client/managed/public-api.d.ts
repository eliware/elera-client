import type { FieldPacket, PoolConnection, QueryResult } from "mysql2/promise";
export type { PoolConnection, QueryResult } from "mysql2/promise";

export interface QueryOptions {
  route?: "primary" | "balanced";
  connection?: PoolConnection;
}

export type QueryValues = unknown[] | Record<string, unknown>;
export type QueryResultTuple = [QueryResult, FieldPacket[]];
type ClientQueryResult = Promise<QueryResultTuple>;

export interface ProbeResult {
  ok: true;
  route: "primary" | "balanced";
  result: QueryResultTuple;
  transaction: "started";
  released: true;
}

export interface DbPool {
  query(sql: string, values?: QueryValues, options?: QueryOptions): ClientQueryResult;
  execute(sql: string, values?: QueryValues, options?: QueryOptions): ClientQueryResult;
  getConnection(): Promise<PoolConnection>;
  probe(sql?: string): Promise<ProbeResult>;
  end(): Promise<void>;
}

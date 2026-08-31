import type { PoolConnection, QueryResult } from 'mysql2/promise';

export interface CreateDbOptions {
  env?: Record<string, string | undefined>;
  endpoint?: string;
  token?: string;
}
export interface DbPool {
  query(...args: Parameters<import('mysql2/promise').Pool['query']>): ReturnType<import('mysql2/promise').Pool['query']>;
  execute(...args: Parameters<import('mysql2/promise').Pool['execute']>): ReturnType<import('mysql2/promise').Pool['execute']>;
  getConnection(): Promise<PoolConnection>;
  probe(sql?: string): Promise<{ ok: true; route: 'primary' | 'balanced'; result: QueryResult; transaction: 'started'; released: true }>;
  end(): Promise<void>;
}
export function createDb(options?: CreateDbOptions): Promise<DbPool>;
export type { PoolConnection, QueryResult } from 'mysql2/promise';

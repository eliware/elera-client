export interface ManagedClientOptions { endpoint?: string; token?: string; routing?: 'auto' | 'primary' | 'balanced'; quarantineMs?: number; drainTimeoutMs?: number; now?: () => number; telemetry?: true | Telemetry; }
export interface TelemetrySnapshot { type: 'client.telemetry'; application: string; credentialName?: string; database?: string; scopes?: string[]; queries: number; failures: number; retries: number; reconnects: number; failoverCount: number; reconnectDelayMs: number; inflight: number; totalLatencyMs: number; maxLatencyMs: number; avgLatencyMs: number; sentAt: string; }
export interface Telemetry { snapshot(): TelemetrySnapshot; }
export interface DbClient { query(sql: string, values?: unknown, options?: { route?: 'auto' | 'primary' | 'balanced' }): Promise<unknown>; execute(sql: string, values?: unknown, options?: { route?: 'auto' | 'primary' | 'balanced' }): Promise<unknown>; transaction<T>(callback: (transaction: Pick<DbClient, 'query' | 'execute'>) => Promise<T>): Promise<T>; health(route?: 'primary' | 'balanced'): Promise<unknown>; close(): Promise<void>; bundle(): unknown; availability(): { state: 'available' | 'cluster-unavailable'; routes: { primary: boolean; balanced: boolean } }; drain(host: string, timeoutMs?: number): { wait(): Promise<unknown[]>; forceClose(): Promise<unknown[]> }; nodeStates(): unknown[]; telemetry?: Telemetry; }
export function createDb(options?: ManagedClientOptions & { fetchImpl?: typeof fetch; fetchPath?: string; WebSocketImpl?: typeof WebSocket }): Promise<DbClient>;
export class SqlClientError extends Error { code?: string; retryable?: boolean; cause?: unknown; }
export class ClusterUnavailableError extends SqlClientError {}
export class ServerUnavailableError extends SqlClientError {}
export function classifyError(error: unknown): { retryable: boolean; code?: string };
export function asSqlError(error: unknown): SqlClientError;

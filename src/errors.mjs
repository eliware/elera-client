export class SqlClientError extends Error {
  constructor(message, { code = 'SQL_CLIENT_ERROR', retryable = false, cause } = {}) { super(message, { cause }); this.name = 'SqlClientError'; this.code = code; this.retryable = retryable; }
}
export class ClusterUnavailableError extends SqlClientError { constructor(message = 'No eligible SQL nodes are available', options = {}) { super(message, { code: 'CLUSTER_UNAVAILABLE', retryable: false, ...options }); this.name = 'ClusterUnavailableError'; } }
export class ServerUnavailableError extends SqlClientError { constructor(message = 'The SQL server is unavailable', options = {}) { super(message, { code: 'SERVER_UNAVAILABLE', retryable: false, ...options }); this.name = 'ServerUnavailableError'; } }
export function classifyError(error) { const code = error?.code; if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR'].includes(code)) return { code: 'CONNECTION_ERROR', retryable: true }; if (['ER_ACCESS_DENIED_ERROR', 'ER_DBACCESS_DENIED_ERROR'].includes(code)) return { code: 'AUTHENTICATION_ERROR', retryable: false }; return { code: code ?? 'SQL_ERROR', retryable: false }; }
export function asSqlError(error, message = 'SQL operation failed') { if (error instanceof SqlClientError) return error; return new SqlClientError(message, { ...classifyError(error), cause: error }); }

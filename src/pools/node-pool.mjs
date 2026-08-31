
import { asSqlError } from '../errors.mjs';
import { createNodeOperations } from './node-pool/operations.mjs';
import { createNodeLifecycle } from './node-pool/lifecycle.mjs';
const connectionFailure = (error) => asSqlError(error).retryable;
export function createNodePool({ profile, mysqlLib, log, now = () => Date.now(), quarantineMs = 5000 }) {
  const { acquireTimeout: _acquireTimeout, ...driverOptions } = profile.options ?? {};
  if (driverOptions.socketPath === undefined) delete driverOptions.socketPath;
  const pool = mysqlLib.createPool({ host: profile.host, port: profile.port, user: profile.user, password: profile.password, database: profile.database, waitForConnections: true, ...driverOptions });
  const sessionStatements = profile.options?.sessionStatements ?? [];
  let failures = 0; let unavailableUntil = 0;
  let lifecycle;
  const forceClose = async () => { lifecycle.unavailable = true; await pool.end(); };
  lifecycle = createNodeLifecycle({ pool, now, onForceClose: forceClose });
  const operations = createNodeOperations({ pool, sessionStatements, begin: () => lifecycle.begin(), end: () => lifecycle.end() });
  return { host: profile.host, port: profile.port, weight: Number(profile.weight ?? 100), get available() { return lifecycle.available && now() >= unavailableUntil; }, set available(value) { if (value) { lifecycle.recover(); unavailableUntil = 0; } else lifecycle.drain(); }, get failures() { return failures; }, get state() { return lifecycle.state; }, get active() { return lifecycle.active; }, drain: lifecycle.drain, recover: lifecycle.recover, waitForIdle: lifecycle.waitForIdle, forceClose,
    async query(sql, values) { if (!this.available) throw new Error(`SQL node ${profile.host} is unavailable`); try { const result = await operations.query(sql, values); failures = 0; return result; } catch (error) { if (connectionFailure(error)) { failures += 1; unavailableUntil = now() + quarantineMs; log?.warn?.('SQL node quarantined', { host: profile.host, port: profile.port, error: error.message }); } throw asSqlError(error); } },
    async execute(sql, values) { if (!this.available) throw new Error(`SQL node ${profile.host} is unavailable`); try { const result = await operations.execute(sql, values); failures = 0; return result; } catch (error) { if (connectionFailure(error)) { failures += 1; unavailableUntil = now() + quarantineMs; } throw asSqlError(error); } },
    async getConnection() { if (!this.available) throw new Error(`SQL node ${profile.host} is unavailable`); try { const connection = await pool.getConnection(); lifecycle.begin(); const release = connection.release.bind(connection); let released = false; connection.release = () => { if (released) return; released = true; lifecycle.end(); release(); }; return connection; } catch (error) { if (connectionFailure(error)) unavailableUntil = now() + quarantineMs; throw asSqlError(error); } },
    async health() { try { await pool.query('SELECT 1'); failures = 0; unavailableUntil = 0; return { ok: true, host: profile.host, port: profile.port }; } catch (error) { if (connectionFailure(error)) { failures += 1; unavailableUntil = now() + quarantineMs; } throw asSqlError(error); } },
    async close() { lifecycle.clear(); await forceClose(); } };
}


import { asSqlError } from '@eliware/elera-lib';
const connectionFailure = (error) => asSqlError(error).retryable;
export function createNodePool({ profile, mysqlLib, log, now = () => Date.now(), quarantineMs = 5000 }) {
  const { acquireTimeout: _acquireTimeout, ...driverOptions } = profile.options ?? {};
  if (driverOptions.socketPath === undefined) delete driverOptions.socketPath;
  const pool = mysqlLib.createPool({ host: profile.host, port: profile.port, user: profile.user, password: profile.password, database: profile.database, waitForConnections: true, ...driverOptions });
  const sessionStatements = profile.options?.sessionStatements ?? [];
  const withConnection = async (operation, sql, values) => { const connection = await pool.getConnection(); try { for (const statement of sessionStatements) await connection.query(statement); return operation(connection, sql, values); } finally { connection.release(); } };
  let failures = 0; let unavailableUntil = 0; let forcedUnavailable = false; let lifecycle = 'ready'; let active = 0; let idleResolve; let drainTimer;
  const begin = () => { active += 1; };
  const end = () => { active = Math.max(0, active - 1); if (!active) idleResolve?.(); };
  const run = async (work) => { begin(); try { return await work(); } finally { end(); } };
  const drain = (timeoutMs = 45000) => { lifecycle = 'draining'; forcedUnavailable = true; unavailableUntil = Number.POSITIVE_INFINITY; clearTimeout(drainTimer); drainTimer = setTimeout(() => { void forceClose(); }, timeoutMs); drainTimer.unref?.(); return { state: lifecycle, active }; };
  const waitForIdle = async (timeoutMs = 45000) => { if (!active) return true; await Promise.race([new Promise((resolve) => { idleResolve = resolve; }), new Promise((resolve) => setTimeout(resolve, timeoutMs))]); idleResolve = undefined; return active === 0; };
  const forceClose = async () => { lifecycle = 'unavailable'; await pool.end(); };
  const recover = () => { clearTimeout(drainTimer); drainTimer = undefined; lifecycle = 'recovering'; forcedUnavailable = false; unavailableUntil = 0; lifecycle = 'ready'; return lifecycle; };
  return { host: profile.host, port: profile.port, weight: Number(profile.weight ?? 100), get available() { return lifecycle === 'ready' && !forcedUnavailable && now() >= unavailableUntil; }, set available(value) { if (value) recover(); else drain(); }, get failures() { return failures; }, get state() { return lifecycle; }, get active() { return active; }, drain, recover, waitForIdle, forceClose,
    async query(sql, values) { if (!this.available) throw new Error(`SQL node ${profile.host} is unavailable`); try { const result = await run(() => sessionStatements.length ? withConnection((connection, statement, params) => connection.query(statement, params), sql, values) : pool.query(sql, values)); failures = 0; return result; } catch (error) { if (connectionFailure(error)) { failures += 1; unavailableUntil = now() + quarantineMs; log?.warn?.('SQL node quarantined', { host: profile.host, port: profile.port, error: error.message }); } throw asSqlError(error); } },
    async execute(sql, values) { if (!this.available) throw new Error(`SQL node ${profile.host} is unavailable`); try { const result = await run(() => sessionStatements.length ? withConnection((connection, statement, params) => connection.execute(statement, params), sql, values) : pool.execute(sql, values)); failures = 0; return result; } catch (error) { if (connectionFailure(error)) { failures += 1; unavailableUntil = now() + quarantineMs; } throw asSqlError(error); } },
    async getConnection() { if (!this.available) throw new Error(`SQL node ${profile.host} is unavailable`); try { const connection = await pool.getConnection(); begin(); const release = connection.release.bind(connection); let released = false; connection.release = () => { if (released) return; released = true; end(); release(); }; return connection; } catch (error) { if (connectionFailure(error)) unavailableUntil = now() + quarantineMs; throw asSqlError(error); } },
    async health() { try { await pool.query('SELECT 1'); failures = 0; unavailableUntil = 0; return { ok: true, host: profile.host, port: profile.port }; } catch (error) { if (connectionFailure(error)) { failures += 1; unavailableUntil = now() + quarantineMs; } throw asSqlError(error); } },
    async close() { clearTimeout(drainTimer); lifecycle = 'unavailable'; await pool.end(); } };
}

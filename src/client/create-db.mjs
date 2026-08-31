
import { log as defaultLog } from '@eliware/common';
import * as mysql from 'mysql2/promise';
import { validateProfile } from '../config.mjs';
import { asSqlError } from '../errors.mjs';
import { validateBundle as validateBundleShape } from '@eliware/elera-lib';
import { clientDrainTimeout } from './drain-policy.mjs';
import { createTelemetry } from '../telemetry.mjs';
import { ROUTING_RESYNC } from '../routing/internal-events.mjs';
import { compareBundleVersions } from '../routing/bundle-version.mjs';
import { bundleNeedsRefresh } from '../routing/bundle-expiry.mjs';
import { resolveCredentials, credentialContext } from './internal/credential-provider.mjs';
import { createRouteFactory } from './route-factory.mjs';
import { classifyQuery, routeFor } from '../routing.mjs';
import { createTimedOperation } from './telemetry-wrapper.mjs';
import { validateTokenContext } from './authorization-context.mjs';

const olderVersion = (candidate, current) => compareBundleVersions(candidate, current) < 0;
const publicBundle = (bundle) => { if (!bundle) return bundle; const { credentials, ...redacted } = bundle; return redacted; };
export async function createDb({ primary, balanced, bundle, credentialProvider, mysqlLib = mysql, log = defaultLog, routing = 'auto', identity, tokenContext, quarantineMs = 5000, drainTimeoutMs = 45000, now = () => Date.now(), telemetry } = {}) {
  if (!primary || typeof primary !== 'object') throw new TypeError('primary connection profile is required');
  const credentials = await resolveCredentials(credentialProvider, credentialContext(primary, { identity }));
  let primaryConfig = validateProfile({ ...primary, ...credentials }, 'primary');
  if (!primaryConfig.user || typeof primaryConfig.password !== 'string') throw new TypeError('primary.user and primary.password are required');
  let balancedConfig = balanced ? validateProfile({ ...primaryConfig, ...balanced, ...credentials }, 'balanced') : undefined;
  if (credentials.user || credentials.password) {
    primaryConfig = validateProfile({ ...primaryConfig, ...credentials }, 'primary');
    if (balancedConfig) balancedConfig = validateProfile({ ...balancedConfig, ...credentials }, 'balanced');
  }
  const validateBundle = (candidate) => validateTokenContext(validateBundleShape(candidate), tokenContext);
  let activeBundle = bundle ? validateBundle(bundle) : undefined;
  const makeRoute = (route, fallback) => createRouteFactory({ bundle: activeBundle, now, mysqlLib, log, quarantineMs })(route, fallback);
  let primaryPool = makeRoute('primary', primaryConfig);
  let balancedPool = balancedConfig || activeBundle?.routes?.balanced?.length ? makeRoute('balanced', balancedConfig ?? primaryConfig) : null;
  const choose = (sql, options = {}) => options.connection ?? (routeFor(sql, options.route ?? routing) === 'balanced' && balancedPool ? balancedPool : primaryPool);
  const metrics = telemetry === true ? createTelemetry({ application: bundle?.application ?? 'default', credentialName: bundle?.credentialName, database: bundle?.database, scopes: bundle?.scopes, now }) : telemetry;
  const timed = createTimedOperation({ metrics, now });
  const client = {
    async query(sql, values, options) { const selectedRoute = routeFor(sql, options?.route ?? routing); return timed(async () => { const selected = choose(sql, options); try { return await selected.query(sql, values); } catch (error) { const requestedRoute = options?.route ?? routing; if (error.retryable && balancedPool && routeFor(sql, requestedRoute) === 'balanced' && classifyQuery(sql) === 'balanced') { metrics?.record?.({ retry: true, route: 'balanced' }); return balancedPool.query(sql, values); } throw error; } }, { route: selectedRoute }); },
    async execute(sql, values, options) { const selectedRoute = routeFor(sql, options?.route ?? routing); return timed(async () => choose(sql, options).execute(sql, values), { route: selectedRoute }); },
    async transaction(callback) { return timed(async () => { const node = primaryPool.choose(); const connection = await node.getConnection(); try { await connection.beginTransaction(); const tx = { query: (sql, values) => connection.query(sql, values), execute: (sql, values) => connection.execute(sql, values) }; const result = await callback(tx); await connection.commit(); return result; } catch (error) { await connection.rollback().catch(() => {}); throw asSqlError(error); } finally { connection.release(); } }); },
    async getConnection() { const node = primaryPool.choose(); return node.getConnection(); },
    async health(route = 'primary') { const started = now(); const selected = route === 'balanced' && balancedPool ? balancedPool : primaryPool; const nodes = await selected.health(); return { ok: nodes.some((node) => node.ok), route: selected === balancedPool ? 'balanced' : 'primary', nodes, latencyMs: now() - started }; },
    async refresh(nextBundle) {
      const candidate = validateBundle(nextBundle);
      if (olderVersion(candidate.bundleVersion, activeBundle?.bundleVersion)) {
        return { bundleVersion: activeBundle?.bundleVersion, refreshRequired: bundleNeedsRefresh(activeBundle, now()) };
      }
      const previous = [primaryPool, balancedPool];
      const credentials = candidate.credentials;
      const writer = candidate.writer;
      const reader = candidate.readers[0] ?? candidate.routes.balanced[0];
      activeBundle = candidate;
      primaryConfig = validateProfile({ ...primaryConfig, host: writer.host, port: writer.port, user: credentials.username, password: credentials.password, database: candidate.database }, 'primary');
      primaryPool = makeRoute('primary', primaryConfig);
      if (reader) {
        balancedConfig = validateProfile({ ...primaryConfig, host: reader.host, port: reader.port }, 'balanced');
        balancedPool = makeRoute('balanced', balancedConfig);
      } else if (balancedPool) {
        for (const node of balancedPool.nodes) node.drain(drainTimeoutMs);
      }
      const obsolete = previous.filter(Boolean).filter((pool) => pool !== primaryPool && pool !== balancedPool);
      obsolete.forEach((pool) => {
        pool.nodes.forEach((node) => node.drain(drainTimeoutMs));
        void (async () => {
          await pool.waitForIdle(drainTimeoutMs);
          await pool.close();
        })();
      });
      return { bundleVersion: activeBundle.bundleVersion, refreshRequired: bundleNeedsRefresh(activeBundle, now()) };
    },
    async attachRoutingStream(stream) { if (!stream?.connect) throw new TypeError('routing stream is required'); metrics?.start?.(stream); stream.setTelemetry?.(metrics); stream.setOnUpdate?.(async (event) => { const update = event.type === 'routing.update' ? { ...event } : event.type === ROUTING_RESYNC ? event.bundle : undefined; if (update?.type) delete update.type; if (update) await client.refresh(update); if (event.type === 'routing.drain') for (const pool of [primaryPool, balancedPool].filter(Boolean)) pool.drain(event.node, clientDrainTimeout(event.drainTimeoutMs ?? drainTimeoutMs)); if (event.type === 'routing.shutdown') for (const pool of [primaryPool, balancedPool].filter(Boolean)) pool.drain(event.node, clientDrainTimeout(event.reconnectDeadlineMs ?? event.drainTimeoutMs ?? drainTimeoutMs)); if (event.type === 'routing.recovery') for (const pool of [primaryPool, balancedPool].filter(Boolean)) pool.recover(event.node, drainTimeoutMs); }); await stream.connect(); return () => stream.close?.(); },
    drain(host, timeoutMs = drainTimeoutMs) { const effectiveTimeout = clientDrainTimeout(timeoutMs); const pools = [primaryPool, balancedPool].filter(Boolean); pools.forEach((pool) => pool.drain(host, effectiveTimeout)); return { host, timeoutMs: effectiveTimeout, wait: () => Promise.all(pools.map((pool) => pool.waitForIdle(effectiveTimeout))), forceClose: () => Promise.all(pools.map((pool) => pool.forceClose(host))) }; },
     availability() { const states = this.nodeStates(); const primaryAvailable = states.some((node) => node.route === 'primary' && node.available); const primaryNodes = states.filter((node) => node.route === 'primary'); const unavailableState = primaryNodes.length <= 1 ? 'standalone-unavailable' : 'cluster-unavailable'; return { state: primaryAvailable ? 'available' : unavailableState, routes: { primary: primaryAvailable, balanced: states.some((node) => node.route === 'balanced' && node.available) } }; },
    nodeStates() { return [primaryPool, balancedPool].filter(Boolean).flatMap((pool) => pool.nodes.map((node) => ({ host: node.host, port: node.port, route: pool === primaryPool ? 'primary' : 'balanced', state: node.state, active: node.active, available: node.available }))); },
    setNodeAvailability(route, host, available) { const pool = route === 'balanced' ? balancedPool : primaryPool; pool?.setAvailability(host, available); },
    bundle: () => publicBundle(activeBundle),
    async close() { metrics?.stop?.(); await Promise.all([primaryPool.close(), balancedPool?.close()]); },
    async end() { return this.close(); },
    telemetry: metrics
  };
  log.debug?.('SQL client created', { balanced: Boolean(balancedPool), routing });
  return client;
}

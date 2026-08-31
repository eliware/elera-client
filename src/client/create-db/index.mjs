
import { log as defaultLog } from '@eliware/common';
import * as mysql from 'mysql2/promise';
import { validateProfile } from '../../config.mjs';
import { validateBundle as validateBundleShape } from '@eliware/elera-lib';
import { clientDrainTimeout } from '../drain-policy.mjs';
import { createTelemetry } from '../../telemetry.mjs';
import { ROUTING_RESYNC } from '../../routing/internal-events.mjs';
import { bundleNeedsRefresh } from '../../routing/bundle-expiry.mjs';
import { resolveCredentials, credentialContext } from '../internal/credential-provider.mjs';
import { createRouteFactory } from '../route-factory.mjs';
import { routeFor } from '../../routing.mjs';
import { createTimedOperation } from '../telemetry-wrapper.mjs';
import { validateTokenContext } from '../authorization-context.mjs';
import { isOlderBundle, bundlesHaveEquivalentPools, hasUsablePool, redactBundle } from './bundle-state.mjs';
import { createRouteSelection } from './route-selection.mjs';
import { createPoolShutdown } from './shutdown.mjs';
import { createDiagnostics } from './diagnostics.mjs';
import { createQueryExecution } from './query-execution.mjs';
import { createTransactionOperation } from './transaction.mjs';
import { createBundleRefresh } from './bundle-refresh.mjs';
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
  const selection = () => createRouteSelection({ primaryPool, balancedPool, routing });
  const metrics = telemetry === true ? createTelemetry({ application: bundle?.application ?? 'default', credentialName: bundle?.credentialName, database: bundle?.database, scopes: bundle?.scopes, now }) : telemetry;
  const timed = createTimedOperation({ metrics, now });
  const shutdown = createPoolShutdown({ getPools: () => [primaryPool, balancedPool].filter(Boolean), drainTimeoutMs, metrics });
  const diagnostics = createDiagnostics({ getPools: () => [primaryPool, balancedPool].filter(Boolean), getPrimaryPool: () => primaryPool, getBalancedPool: () => balancedPool, now });
  const execution = createQueryExecution({ selection, timed, metrics, balancedPool, routeFor, routing });
  const transaction = createTransactionOperation({ primaryPool, timed });
  const refreshBundle = createBundleRefresh({ validateBundle, getBundle: () => activeBundle, setBundle: (value) => { activeBundle = value; }, getPrimaryConfig: () => primaryConfig, setPrimaryConfig: (value) => { primaryConfig = value; }, getBalancedPool: () => balancedPool, setBalancedPool: (value) => { balancedPool = value; }, getPrimaryPool: () => primaryPool, setPrimaryPool: (value) => { primaryPool = value; }, makeRoute, validateProfile, bundleNeedsRefresh, isOlderBundle, equivalentPools: bundlesHaveEquivalentPools, usablePool: hasUsablePool, drainTimeoutMs, now });
  const client = {
    async query(sql, values, options) { return execution.query(sql, values, options); },
    async execute(sql, values, options) { return execution.execute(sql, values, options); },
    async probe(sql = 'SELECT 1') { const route = routeFor(sql); const result = await client.query(sql); const connection = await client.getConnection(); let transaction = 'started'; try { await connection.beginTransaction(); await connection.rollback(); } finally { connection.release(); } return { ok: true, route, result, transaction, released: true }; },
    async transaction(callback) { return transaction(callback); },
    async getConnection() { const node = primaryPool.choose(); return node.getConnection(); },
    async health(route = 'primary') { return diagnostics.health(route); },
    async refresh(nextBundle) { return refreshBundle(nextBundle); },
    async attachRoutingStream(stream) { if (!stream?.connect) throw new TypeError('routing stream is required'); metrics?.start?.(stream); stream.setTelemetry?.(metrics); stream.setOnUpdate?.(async (event) => { const update = event.type === 'routing.update' ? { ...event } : event.type === ROUTING_RESYNC ? event.bundle : undefined; if (update?.type) delete update.type; if (update) await client.refresh(update); if (event.type === 'routing.drain') for (const pool of [primaryPool, balancedPool].filter(Boolean)) pool.drain(event.node, clientDrainTimeout(event.drainTimeoutMs ?? drainTimeoutMs)); if (event.type === 'routing.shutdown') for (const pool of [primaryPool, balancedPool].filter(Boolean)) pool.drain(event.node, clientDrainTimeout(event.reconnectDeadlineMs ?? event.drainTimeoutMs ?? drainTimeoutMs)); if (event.type === 'routing.recovery') for (const pool of [primaryPool, balancedPool].filter(Boolean)) pool.recover(event.node, drainTimeoutMs); }); await stream.connect(); return () => stream.close?.(); },
    drain(host, timeoutMs = drainTimeoutMs) { const effectiveTimeout = clientDrainTimeout(timeoutMs); const pools = [primaryPool, balancedPool].filter(Boolean); pools.forEach((pool) => pool.drain(host, effectiveTimeout)); return { host, timeoutMs: effectiveTimeout, wait: () => Promise.all(pools.map((pool) => pool.waitForIdle(effectiveTimeout))), forceClose: () => Promise.all(pools.map((pool) => pool.forceClose(host))) }; },
    availability() { return diagnostics.availability(); },
    nodeStates() { return diagnostics.nodeStates(); },
    setNodeAvailability(route, host, available) { const pool = route === 'balanced' ? balancedPool : primaryPool; pool?.setAvailability(host, available); },
    bundle: () => redactBundle(activeBundle),
    async close() { return shutdown.close(); },
    async end() { return this.close(); },
    telemetry: metrics
  };
  log.debug?.('SQL client created', { balanced: Boolean(balancedPool), routing });
  return client;
}

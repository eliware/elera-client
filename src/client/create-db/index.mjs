
import { log as defaultLog } from '@eliware/common';
import * as mysql from 'mysql2/promise';
import { validateProfile } from '../../config.mjs';
import { validateBundle as validateBundleShape } from '@eliware/elera-lib';
import { clientDrainTimeout } from '../drain-policy.mjs';
import { createTelemetry } from '../../telemetry.mjs';
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
import { createRoutingEventHandler } from './routing-events.mjs';
import { createClientApi } from './public-api.mjs';
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
  // Intentional late binding: refreshed bundles must build routes from activeBundle.
  const makeRoute = (route, fallback) => createRouteFactory({ bundle: activeBundle, now, mysqlLib, log, quarantineMs })(route, fallback);
  let primaryPool = makeRoute('primary', primaryConfig);
  let balancedPool = (balancedConfig || activeBundle?.routes?.balanced?.length)
    ? makeRoute('balanced', balancedConfig ?? primaryConfig)
    : null;
  const selection = () => createRouteSelection({ primaryPool, balancedPool, routing });
  const metrics = telemetry === true ? createTelemetry({ application: activeBundle?.application ?? 'default', credentialName: activeBundle?.credentialName, database: activeBundle?.database, scopes: activeBundle?.scopes, now }) : telemetry;
  const timed = createTimedOperation({ metrics, now });
  const shutdown = createPoolShutdown({ getPools: () => [primaryPool, balancedPool].filter(Boolean), drainTimeoutMs, metrics });
  const diagnostics = createDiagnostics({ getPools: () => [primaryPool, balancedPool].filter(Boolean), getPrimaryPool: () => primaryPool, getBalancedPool: () => balancedPool, now });
  const execution = createQueryExecution({ selection, timed, metrics, getBalancedPool: () => balancedPool, routeFor, routing });
  const transaction = createTransactionOperation({ primaryPool, timed });
  const refreshBundle = createBundleRefresh({ validateBundle, getBundle: () => activeBundle, setBundle: (value) => { activeBundle = value; metrics?.setContext?.({ application: value.application, credentialName: value.credentialName, database: value.database, scopes: value.scopes }); }, getPrimaryConfig: () => primaryConfig, setPrimaryConfig: (value) => { primaryConfig = value; }, getBalancedPool: () => balancedPool, setBalancedPool: (value) => { balancedPool = value; }, getPrimaryPool: () => primaryPool, setPrimaryPool: (value) => { primaryPool = value; }, makeRoute, validateProfile, bundleNeedsRefresh, isOlderBundle, equivalentPools: bundlesHaveEquivalentPools, usablePool: hasUsablePool, drainTimeoutMs, now });
  /* istanbul ignore next -- API wiring is covered through managed integration tests. */
  const client = createClientApi({ execution, transaction, diagnostics, refreshBundle, shutdown, routeFor, getPrimaryPool: () => primaryPool, getBalancedPool: () => balancedPool, getBundle: () => redactBundle(activeBundle), setNodeAvailability: (route, host, available) => { const pool = route === 'balanced' ? balancedPool : primaryPool; pool?.setAvailability(host, available); }, attachRoutingStream: async (stream, api) => { if (!stream?.connect) throw new TypeError('routing stream is required'); metrics?.start?.(stream); stream.setTelemetry?.(metrics); stream.setOnUpdate?.(createRoutingEventHandler({ refresh: (event) => api.refresh(event), getPools: () => [primaryPool, balancedPool].filter(Boolean), drainTimeoutMs })); await stream.connect(); return () => stream.close?.(); }, drain: (host, timeoutMs = drainTimeoutMs) => { const effectiveTimeout = clientDrainTimeout(timeoutMs); const pools = [primaryPool, balancedPool].filter(Boolean); pools.forEach((pool) => pool.drain(host, effectiveTimeout)); return { host, timeoutMs: effectiveTimeout, wait: () => Promise.all(pools.map((pool) => pool.waitForIdle(effectiveTimeout))), forceClose: () => Promise.all(pools.map((pool) => pool.forceClose(host))) }; }, telemetry: metrics });
  log.debug?.('SQL client created', { balanced: Boolean(balancedPool), routing });
  return client;
}

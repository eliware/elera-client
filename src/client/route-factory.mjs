
import { bundleExpired } from '../routing/bundle-expiry.mjs';
import { createNodePool, createRoutePool } from '../pools.mjs';
import { bundleProfiles } from './bundle-profiles.mjs';

const routeProfiles = (bundle, route, fallback, now) => {
  if (!bundle) return [fallback];
  if (bundleExpired(bundle, now())) return [fallback];
  const profiles = bundleProfiles(bundle, route, fallback);
  return profiles.length ? profiles : [fallback];
};

export function createRouteFactory({ bundle, now, mysqlLib, log, quarantineMs }) {
  return (route, fallback) => createRoutePool(routeProfiles(bundle, route, fallback, now).map((profile) => createNodePool({ profile, mysqlLib, log, now, quarantineMs })), { preferred: route === 'primary' });
}

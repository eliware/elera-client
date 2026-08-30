
import { bundleExpired } from '../routing/bundle-expiry.mjs';
import { createNodePool, createRoutePool } from '../pools.mjs';
import { bundleProfiles } from './bundle-profiles.mjs';

const routeProfiles = (bundle, route, baseProfile, now) => {
  if (!bundle) return [baseProfile];
  if (bundleExpired(bundle, now())) return [baseProfile];
  const profiles = bundleProfiles(bundle, route, baseProfile);
  return profiles.length ? profiles : [baseProfile];
};

export function createRouteFactory({ bundle, now, mysqlLib, log, quarantineMs }) {
  return (route, baseProfile) => createRoutePool(routeProfiles(bundle, route, baseProfile, now).map((profile) => createNodePool({ profile, mysqlLib, log, now, quarantineMs })), { preferred: route === 'primary' });
}

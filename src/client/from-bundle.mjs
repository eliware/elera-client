
import { validateBundle } from '@eliware/elera-lib';

export function profilesFromBundle(bundle) {
  const valid = validateBundle(bundle);
  const credentials = valid.credentials;
  const base = { host: valid.routes.primary[0]?.host, port: valid.routes.primary[0]?.port, user: credentials.username, password: credentials.password, database: valid.physicalDatabase };
  const balancedRoutes = valid.routes.balanced;
  const balancedNode = balancedRoutes[0];
  return { primary: base, balanced: balancedNode ? { ...base, host: balancedNode.host, port: balancedNode.port } : undefined };
}

export async function createDbFromBundle({ bundle, createClient, ...options } = {}) {
  const profiles = profilesFromBundle(bundle);
       const factory = createClient ?? (await import('./create-db.mjs')).createDb;
  return factory({ ...options, ...profiles, bundle, identity: bundle.identity });
}

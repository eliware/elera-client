import { profilesFromBundle } from "./profiles-from-bundle.mjs";

export async function createDbFromBundle({ bundle, createClient, ...options } = {}) {
  const profiles = profilesFromBundle(bundle);
  const factory = createClient ?? (await import("../runtime/index.mjs")).createDb;
  return factory({ ...options, ...profiles, bundle, identity: bundle.identity });
}

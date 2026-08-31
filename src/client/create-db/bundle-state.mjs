import { compareBundleVersions } from '../../routing/bundle-version.mjs';

export const isOlderBundle = (candidate, current) => compareBundleVersions(candidate, current) < 0;

export const bundlesHaveEquivalentPools = (candidate, current) => current
  && candidate.bundleVersion === current.bundleVersion
  && JSON.stringify({ physicalDatabase: candidate.physicalDatabase, credentials: candidate.credentials, writer: candidate.writer, routes: candidate.routes })
    === JSON.stringify({ physicalDatabase: current.physicalDatabase, credentials: current.credentials, writer: current.writer, routes: current.routes });

export const hasUsablePool = (pool) => pool?.nodes?.some((node) => node.available);

export const redactBundle = (bundle) => {
  if (!bundle) return bundle;
  const { credentials, ...redacted } = bundle;
  return redacted;
};

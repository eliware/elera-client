import { compareBundleVersions } from "../bundle/version.mjs";

export function classifyEventVersion(version, expectedVersion) {
  if (
    version !== undefined &&
    expectedVersion !== 0 &&
    compareBundleVersions(version, expectedVersion) <= 0
  )
    return "stale";
  const numericVersion = Number(version);
  const numericExpected = Number(expectedVersion);
  if (
    Number.isInteger(numericVersion) &&
    Number.isInteger(numericExpected) &&
    numericExpected > 0 &&
    numericVersion > numericExpected + 1
  )
    return "gap";
  return "accepted";
}

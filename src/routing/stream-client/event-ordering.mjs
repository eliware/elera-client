import { compareBundleVersions } from "../bundle-version.mjs";

export function orderRoutingEvent(event, { state, fallback }) {
  const version = event.version;
  if (
    version !== undefined &&
    state.expectedVersion !== 0 &&
    compareBundleVersions(version, state.expectedVersion) <= 0
  )
    return { accepted: false };
  const numericVersion = Number(version);
  const numericExpected = Number(state.expectedVersion);
  if (
    Number.isInteger(numericVersion) &&
    Number.isInteger(numericExpected) &&
    numericExpected > 0 &&
    numericVersion > numericExpected + 1
  ) {
    const recovery = fallback();
    return {
      accepted: true,
      recovery: Promise.resolve(recovery),
      complete: () => {
        state.expectedVersion = version;
      },
    };
  }
  state.expectedVersion = version;
  return { accepted: true };
}

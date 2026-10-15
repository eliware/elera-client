import { classifyEventVersion } from "./version-classification.mjs";

export function orderRoutingEvent(event, { state, fallback }) {
  const { version } = event;
  const classification = classifyEventVersion(version, state.expectedVersion);
  if (classification === "stale") return { accepted: false };
  if (classification === "gap") {
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

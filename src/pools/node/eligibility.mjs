export function createNodeEligibility({ lifecycle, isQuarantined }) {
  return () => lifecycle.available && !isQuarantined();
}

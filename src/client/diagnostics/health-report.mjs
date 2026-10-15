export async function createHealthReport({ route, getPrimaryPool, getBalancedPool, now }) {
  const started = now();
  const balanced = getBalancedPool();
  const selected = route === "balanced" && balanced ? balanced : getPrimaryPool();
  const nodes = await selected.health();
  return {
    ok: nodes.some((node) => node.ok),
    route: selected === balanced ? "balanced" : "primary",
    nodes,
    latencyMs: now() - started,
  };
}

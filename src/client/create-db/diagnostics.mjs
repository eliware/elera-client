export function createDiagnostics({ getPools, getPrimaryPool, getBalancedPool, now }) {
  const health = async (route = 'primary') => {
    const started = now();
    const balanced = getBalancedPool();
    const selected = route === 'balanced' && balanced ? balanced : getPrimaryPool();
    const nodes = await selected.health();
    return { ok: nodes.some((node) => node.ok), route: selected === balanced ? 'balanced' : 'primary', nodes, latencyMs: now() - started };
  };
  const nodeStates = () => getPools().flatMap((pool) => pool.nodes.map((node) => ({ host: node.host, port: node.port, route: pool === getPrimaryPool() ? 'primary' : 'balanced', state: node.state, active: node.active, available: node.available })));
  const availability = () => {
    const states = nodeStates();
    const primaryAvailable = states.some((node) => node.route === 'primary' && node.available);
    const primaryNodes = states.filter((node) => node.route === 'primary');
    return { state: primaryAvailable ? 'available' : primaryNodes.length <= 1 ? 'standalone-unavailable' : 'cluster-unavailable', routes: { primary: primaryAvailable, balanced: states.some((node) => node.route === 'balanced' && node.available) } };
  };
  return { health, nodeStates, availability };
}

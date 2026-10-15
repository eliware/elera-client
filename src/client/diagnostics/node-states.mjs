export function getNodeStates({ getPools, getPrimaryPool }) {
  return getPools().flatMap((pool) =>
    pool.nodes.map((node) => ({
      host: node.host,
      port: node.port,
      route: pool === getPrimaryPool() ? "primary" : "balanced",
      state: node.state,
      active: node.active,
      available: node.available,
    })),
  );
}

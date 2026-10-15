export function retireObsoletePools({ previous, retained, drainTimeoutMs }) {
  previous
    .filter(Boolean)
    .filter((pool) => !retained.includes(pool))
    .forEach((pool) => {
      pool.nodes.forEach((node) => node.drain(drainTimeoutMs));
      void (async () => {
        await pool.waitForIdle(drainTimeoutMs);
        await pool.close();
      })();
    });
}

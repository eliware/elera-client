export function retireObsoletePools({ previous, retained, drainTimeoutMs }) {
  previous
    .filter(Boolean)
    .filter((pool) => !retained.includes(pool))
    .forEach((pool) => {
      pool.nodes.forEach((node) => node.drain(drainTimeoutMs));
      void (async () => {
        const idle = await pool.waitForIdle(drainTimeoutMs);
        if (idle !== false && (!Array.isArray(idle) || idle.every(Boolean))) await pool.close();
      })();
    });
}

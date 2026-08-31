export function createPoolHealth(nodes) {
  return async function health() {
    const results = [];
    for (const node of nodes) {
      try { results.push(await node.health()); }
      catch (error) { results.push({ ok: false, host: node.host, port: node.port, error: error.message }); }
    }
    return results;
  };
}

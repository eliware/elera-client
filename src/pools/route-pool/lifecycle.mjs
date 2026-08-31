export function createPoolLifecycle(nodes) {
  const setAvailability = (host, available) => { for (const node of nodes) if (node.host === host) node.available = available; };
  const lifecycle = (host, state) => nodes.filter((node) => node.host === host).map((node) => state === 'draining' ? node.drain() : node.recover());
  const drain = (host, timeoutMs) => { for (const node of nodes.filter((value) => value.host === host)) node.drain?.(timeoutMs); return lifecycle(host, 'draining'); };
  const recover = (host) => lifecycle(host, 'recovering');
  const waitForIdle = (timeoutMs) => Promise.all(nodes.map((node) => node.waitForIdle?.(timeoutMs) ?? true));
  const forceClose = (host) => Promise.all(nodes.filter((node) => !host || node.host === host).map((node) => node.forceClose?.() ?? node.close()));
  const close = async () => Promise.all(nodes.map((node) => node.close()));
  return { setAvailability, drain, recover, waitForIdle, forceClose, close };
}

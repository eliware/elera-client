
import { ClusterUnavailableError, ServerUnavailableError } from '../../errors.mjs';
import { createNodeSelector } from './selection.mjs';

export function createRoutePool(nodes, { preferred = false, unavailableError = nodes.length === 1 ? ServerUnavailableError : ClusterUnavailableError } = {}) {
  const { choose } = createNodeSelector(nodes, { preferred, unavailableError });
  const setAvailability = (host, available) => {
    for (const node of nodes) if (node.host === host) node.available = available;
  };
  const lifecycle = (host, state) => nodes.filter((node) => node.host === host).map((node) => state === 'draining' ? node.drain() : node.recover());
  const drain = (host, timeoutMs) => { for (const node of nodes.filter((value) => value.host === host)) node.drain?.(timeoutMs); return lifecycle(host, 'draining'); };
  const recover = (host) => lifecycle(host, 'recovering');
  const waitForIdle = (timeoutMs) => Promise.all(nodes.map((node) => node.waitForIdle?.(timeoutMs) ?? true));
  const forceClose = (host) => Promise.all(nodes.filter((node) => !host || node.host === host).map((node) => node.forceClose?.() ?? node.close()));
  const query = (sql, values) => choose().query(sql, values);
  const execute = (sql, values) => choose().execute(sql, values);
  const health = async () => {
    const results = [];
    for (const node of nodes) {
      try {
        results.push(await node.health());
      } catch (error) {
        results.push({ ok: false, host: node.host, port: node.port, error: error.message });
      }
    }
    return results;
  };
  const close = async () => Promise.all(nodes.map((node) => node.close()));
  return { nodes, choose, setAvailability, drain, recover, waitForIdle, forceClose, query, execute, health, close };
}

export function validateRoutingNode(node, name = 'routing node') {
  if (!node || typeof node !== 'object' || typeof node.host !== 'string' || node.host.trim() === '') throw new TypeError(`${name} host is required`);
  const port = Number(node.port ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError(`${name} port is invalid`);
  if (node.weight !== undefined && (!Number.isFinite(Number(node.weight)) || Number(node.weight) < 0)) throw new TypeError(`${name} weight is invalid`);
  return { ...node, host: node.host.trim(), port };
}

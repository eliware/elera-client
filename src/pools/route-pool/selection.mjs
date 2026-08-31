export function createNodeSelector(nodes, { preferred = false, unavailableError }) {
  let cursor = 0;
  const choose = () => {
    const available = nodes.filter((node) => node.available);
    if (!available.length) throw new unavailableError('no eligible SQL nodes available');
    if (preferred) return available[0];
    const total = available.reduce((sum, node) => sum + Math.max(0, node.weight), 0);
    if (!total) return available[cursor++ % available.length];
    let target = cursor++ % total;
    let selected = available[available.length - 1];
    for (const node of available) {
      const weight = Math.max(0, node.weight);
      if (target < weight) { selected = node; break; }
      target -= weight;
    }
    return selected;
  };
  return { choose };
}

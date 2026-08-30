export function compareBundleVersions(left, right) {
  if (left === undefined || right === undefined) return 0;
  const a = String(left).match(/\d+/g)?.map(Number); const b = String(right).match(/\d+/g)?.map(Number);
  if (!a || !b) return String(left).localeCompare(String(right));
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) { const difference = (a[index] ?? 0) - (b[index] ?? 0); if (difference) return Math.sign(difference); }
  return 0;
}

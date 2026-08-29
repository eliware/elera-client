
const READ_PATTERN = /^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i;

export function classifyQuery(sql) {
  if (typeof sql !== 'string') return 'primary';
  const statement = sql.trim().replace(/^(--[^\n]*\n|#[^\n]*\n|\/\*[\s\S]*?\*\/\s*)+/, '').trim();
  if (!READ_PATTERN.test(statement) || statement.includes(';')) return 'primary';
  if (/\b(FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE|INTO\s+(OUTFILE|DUMPFILE)|CALL)\b/i.test(statement)) return 'primary';
  return 'balanced';
}

export function routeFor(sql, requested = 'auto') {
  if (requested === 'primary' || requested === 'balanced') return requested;
  if (requested !== 'auto') throw new TypeError(`Unsupported SQL route: ${requested}`);
  return classifyQuery(sql);
}


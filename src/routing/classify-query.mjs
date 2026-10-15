import { splitStatements } from "./split-statements.mjs";

const READ_PATTERN = /^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i;

export function classifyQuery(sql) {
  const statements = splitStatements(sql);
  if (statements.length !== 1) return "primary";
  const [statement] = statements;
  if (!READ_PATTERN.test(statement)) return "primary";
  if (/\b(FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE|INTO\s+(OUTFILE|DUMPFILE)|CALL)\b/i.test(statement))
    return "primary";
  return "balanced";
}

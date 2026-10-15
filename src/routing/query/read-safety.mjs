const READ_PATTERN = /^(SELECT|SHOW|DESCRIBE|DESC|EXPLAIN)\b/i;
const UNSAFE_PATTERN =
  /\b(FOR\s+UPDATE|LOCK\s+IN\s+SHARE\s+MODE|INTO\s+(OUTFILE|DUMPFILE)|CALL)\b/i;

export function isSafeRead(statement) {
  return READ_PATTERN.test(statement) && !UNSAFE_PATTERN.test(statement);
}

import { splitStatements } from "./split-statements.mjs";
import { isSafeRead } from "./read-safety.mjs";

export function classifyQuery(sql) {
  const statements = splitStatements(sql);
  if (statements.length !== 1) return "primary";
  return isSafeRead(statements[0]) ? "balanced" : "primary";
}

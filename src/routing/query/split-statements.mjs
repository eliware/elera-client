export function splitStatements(sql) {
  if (typeof sql !== "string") return [];
  const statement = sql
    .trim()
    .replace(/^(--[^\n]*\n|#[^\n]*\n|\/\*[\s\S]*?\*\/\s*)+/, "")
    .trim();
  return statement.split(";").map((part) => part.trim());
}

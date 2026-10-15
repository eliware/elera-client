import { classifyQuery } from "./routing/classify-query.mjs";
export { classifyQuery };

export function routeFor(sql, requested = "auto") {
  if (requested === "primary" || requested === "balanced") return requested;
  if (requested !== "auto") throw new TypeError(`Unsupported SQL route: ${requested}`);
  return classifyQuery(sql);
}

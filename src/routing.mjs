import { classifyQuery } from "./routing/query/classify.mjs";
export { classifyQuery };

export function routeFor(sql, requested = "auto") {
  if (requested === "primary" || requested === "balanced") return requested;
  if (requested !== "auto") throw new TypeError(`Unsupported SQL route: ${requested}`);
  return classifyQuery(sql);
}

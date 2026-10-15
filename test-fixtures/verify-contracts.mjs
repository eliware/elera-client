import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const entrypoint = await readFile(new URL("../src/index.mjs", import.meta.url), "utf8");
const declarations = await readFile(new URL("../src/index.d.ts", import.meta.url), "utf8");
const clientApi = await readFile(
  new URL("../src/client/managed/public-api.d.ts", import.meta.url),
  "utf8",
);
const managedEntry = await readFile(
  new URL("../src/client/managed/index.d.ts", import.meta.url),
  "utf8",
);

const failures = [];
const requireText = (text, pattern, description) => {
  if (!text.includes(pattern)) failures.push(description);
};

if (JSON.stringify(Object.keys(packageJson.exports ?? {})) !== '["."]')
  failures.push("package must expose only its root entrypoint");
if (packageJson.main !== packageJson.exports?.["."]?.import)
  failures.push("package main and root import must match");
if (packageJson.exports?.["."]?.import !== "./src/index.mjs")
  failures.push("package export must point to src/index.mjs");
if (packageJson.exports?.["."]?.types !== "./src/index.d.ts")
  failures.push("package export must point to src/index.d.ts");
requireText(entrypoint, "export { createDb }", "public entrypoint must export createDb");
requireText(declarations, "export { createDb }", "root declarations must export createDb");
requireText(
  managedEntry,
  "export function createDb(",
  "managed declarations must declare createDb",
);
requireText(clientApi, "getConnection()", "client declarations must expose getConnection");
requireText(clientApi, "end(): Promise<void>", "client declarations must expose end");
requireText(clientApi, "export interface ProbeResult", "declarations must name the probe result");
requireText(
  managedEntry,
  "export interface CreateDbOptions",
  "managed declarations must name options",
);
requireText(
  clientApi,
  "export type { PoolConnection, QueryResult }",
  "client declarations must re-export driver types",
);
for (const legacyName of [
  "bundle",
  "refresh",
  "availability",
  "nodeStates",
  "drain",
  "telemetry",
  "close",
  "transaction",
]) {
  if (
    new RegExp(`(?:export |interface |\u007b|,)${legacyName}`).test(entrypoint) ||
    new RegExp(`(?:interface |\u007b|,)${legacyName}[(:?]`).test(clientApi)
  )
    failures.push(`legacy Elera API must not be public: ${legacyName}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Client public contract is valid.");
}

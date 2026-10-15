import { createTelemetry } from "../../telemetry/index.mjs";

export function createClientTelemetry({ telemetry, bundle, now }) {
  if (telemetry !== true) return telemetry;
  return createTelemetry({
    application: bundle?.application ?? "default",
    credentialName: bundle?.credentialName,
    database: bundle?.database,
    scopes: bundle?.scopes,
    now,
  });
}

import { expect, test } from "@jest/globals";
import { createTelemetryContext } from "../../src/telemetry/context.mjs";

test("updates and returns application context", () => {
  const context = createTelemetryContext({ application: "app" });
  context.set({ database: "db" });
  context.set();
  expect(context.snapshot()).toEqual({
    application: "app",
    credentialName: undefined,
    database: "db",
    scopes: undefined,
  });
});

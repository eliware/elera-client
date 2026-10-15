import { expect, test } from "@jest/globals";
import { createTelemetryState } from "../../src/telemetry/state.mjs";

test("aggregates request and reconnect telemetry", () => {
  const metrics = createTelemetryState({ application: "app", now: () => 1000 });
  expect(metrics.begin()).toBe(1000);
  metrics.record({
    latencyMs: 4,
    failed: true,
    retry: true,
    route: "balanced",
    reconnect: true,
    failover: true,
  });
  metrics.recordReconnect({ delayMs: 7, failover: true });
  expect(metrics.snapshot()).toMatchObject({
    type: "client.telemetry",
    application: "app",
    queries: 1,
    failures: 1,
    retries: 1,
    reconnects: 1,
    failoverCount: 1,
    reconnectDelayMs: 7,
    avgLatencyMs: 4,
    inflight: 0,
    routes: { primary: 0, balanced: 1 },
  });
});

test("applies defaults and context to sparse telemetry records", () => {
  const metrics = createTelemetryState();
  metrics.record();
  metrics.record({ route: "primary" });
  metrics.recordReconnect({ delayMs: "bad" });
  metrics.recordReconnect({ delayMs: -4 });
  metrics.setContext({ database: "db" });
  expect(metrics.snapshot()).toMatchObject({
    application: "default",
    database: "db",
    queries: 2,
    routes: { primary: 1, balanced: 0 },
    failures: 0,
    reconnects: 2,
    reconnectDelayMs: 0,
  });
});

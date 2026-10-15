import { expect, test } from "@jest/globals";
import { createTelemetryState } from "../../src/telemetry/state.mjs";

test("aggregates request and reconnect telemetry", () => {
  const metrics = createTelemetryState({ application: "app", now: () => 1000 });
  expect(metrics.begin()).toBe(1000);
  metrics.record({ latencyMs: 4, failed: true, retry: true, route: "balanced" });
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

test("normalizes reconnect delays and updates context", () => {
  const metrics = createTelemetryState();
  metrics.recordReconnect({ delayMs: "bad" });
  metrics.recordReconnect({ delayMs: -4 });
  metrics.setContext({ database: "db" });
  expect(metrics.snapshot()).toMatchObject({ reconnects: 2, reconnectDelayMs: 0, database: "db" });
});

test("uses default values for sparse records and counts routes", () => {
  const metrics = createTelemetryState();
  metrics.record();
  metrics.record({ route: "primary" });
  expect(metrics.snapshot()).toMatchObject({
    queries: 2,
    routes: { primary: 1, balanced: 0 },
    failures: 0,
  });
});

test("records reconnect flags and accepts empty context updates", () => {
  const metrics = createTelemetryState();
  metrics.record({ reconnect: true, failover: true });
  metrics.recordReconnect();
  metrics.setContext();
  expect(metrics.snapshot()).toMatchObject({ reconnects: 2, failoverCount: 1 });
});

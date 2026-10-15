import { expect, test } from "@jest/globals";
import { createTelemetrySnapshot } from "../../src/telemetry/snapshot.mjs";

test("formats telemetry fields and the average latency", () => {
  expect(
    createTelemetrySnapshot({
      context: { application: "app" },
      operationStats: { queries: 2, totalLatencyMs: 9 },
      reconnectStats: { reconnects: 1 },
      now: () => 0,
    }),
  ).toEqual({
    type: "client.telemetry",
    application: "app",
    queries: 2,
    totalLatencyMs: 9,
    reconnects: 1,
    avgLatencyMs: 4.5,
    sentAt: "1970-01-01T00:00:00.000Z",
  });
});

test("reports zero average latency when no query ran", () => {
  expect(
    createTelemetrySnapshot({
      context: {},
      operationStats: { queries: 0, totalLatencyMs: 0 },
      reconnectStats: {},
      now: () => 0,
    }).avgLatencyMs,
  ).toBe(0);
});

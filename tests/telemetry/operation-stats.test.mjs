import { expect, test } from "@jest/globals";
import { createOperationStats } from "../../src/telemetry/operation-stats.mjs";

test("tracks query counts, latency, status, and route", () => {
  const stats = createOperationStats();
  expect(stats.begin(() => 7)).toBe(7);
  stats.record();
  stats.record({ latencyMs: 4, failed: true, retry: true, route: "balanced" });
  expect(stats.snapshot()).toMatchObject({
    queries: 2,
    failures: 1,
    retries: 1,
    inflight: 0,
    totalLatencyMs: 4,
    maxLatencyMs: 4,
    routes: { primary: 0, balanced: 1 },
  });
});

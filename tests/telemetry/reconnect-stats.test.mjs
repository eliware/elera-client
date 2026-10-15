import { expect, test } from "@jest/globals";
import { createReconnectStats } from "../../src/telemetry/reconnect-stats.mjs";

test("tracks reconnects, delay, and failover counts", () => {
  const stats = createReconnectStats();
  stats.recordReconnect({ failover: true });
  stats.recordReconnect();
  stats.recordReconnect({ delayMs: "bad" });
  stats.recordReconnect({ delayMs: -4 });
  expect(stats.snapshot()).toEqual({ reconnects: 4, reconnectDelayMs: 0, failoverCount: 1 });
});

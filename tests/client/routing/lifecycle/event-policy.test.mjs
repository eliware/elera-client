import { expect, test } from "@jest/globals";
import { lifecycleEventPolicy } from "../../../../src/client/routing/lifecycle/event-policy.mjs";

test("resolves drain and shutdown timeout policy", () => {
  expect(lifecycleEventPolicy({ type: "routing.drain", drainTimeoutMs: 10 }, 20)).toEqual({
    action: "drain",
    timeoutMs: 10,
  });
  expect(lifecycleEventPolicy({ type: "routing.shutdown", reconnectDeadlineMs: 5 }, 20)).toEqual({
    action: "drain",
    timeoutMs: 5,
  });
});

test("uses the default timeout for recovery and ignores unknown events", () => {
  expect(lifecycleEventPolicy({ type: "routing.recovery" }, 20)).toEqual({
    action: "recover",
    timeoutMs: 20,
  });
  expect(lifecycleEventPolicy({ type: "routing.unknown" }, 20)).toBeUndefined();
});

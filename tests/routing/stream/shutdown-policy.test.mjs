import { expect, test } from "@jest/globals";
import { shouldCancelShutdownReconnect } from "../../../src/routing/stream/shutdown-policy.mjs";

test.each([
  [{ reconnectDeadlineMs: 0 }, true],
  [{ reconnectDeadlineMs: -1 }, true],
  [{ reconnectDeadlineMs: 1 }, false],
])("checks reconnect cancellation for shutdown event %j", (event, expected) => {
  expect(shouldCancelShutdownReconnect(event)).toBe(expected);
});

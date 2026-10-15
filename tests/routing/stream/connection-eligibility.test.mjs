import { expect, test } from "@jest/globals";
import { canStartConnection } from "../../../src/routing/stream/connection-eligibility.mjs";

test.each([
  [{ closed: true }, 0, false],
  [{ connecting: true }, 0, false],
  [{ socket: { readyState: 1 } }, 0, false],
  [{ reconnectDeadlineAt: 5 }, 5, false],
  [{ reconnectDeadlineAt: 5 }, 4, true],
  [{}, 0, true],
])("checks whether a connection can start for state %j", (state, time, expected) => {
  expect(canStartConnection({ state, now: () => time })).toBe(expected);
});

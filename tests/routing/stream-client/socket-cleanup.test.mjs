import { expect, jest, test } from "@jest/globals";
import { clearSocketState } from "../../../src/routing/stream-client/socket-cleanup.mjs";

test("clears socket state and stops its heartbeat", () => {
  jest.useFakeTimers();
  const heartbeat = setInterval(() => {}, 1000);
  const state = { connecting: true, heartbeat, socket: {}, mode: "websocket" };
  clearSocketState(state);
  expect(state).toMatchObject({
    connecting: false,
    heartbeat: undefined,
    socket: undefined,
    mode: "disconnected",
  });
  expect(jest.getTimerCount()).toBe(0);
  jest.useRealTimers();
});

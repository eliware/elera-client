import { expect, jest, test } from "@jest/globals";
import { createConnectionRecovery } from "../../../../src/routing/stream/connection/recovery.mjs";

test("cleans up a socket and schedules recovery after ordinary closure", () => {
  const state = {
    connecting: false,
    heartbeat: undefined,
    socket: {},
    mode: "websocket",
    closed: false,
    plannedReconnect: false,
  };
  const fallback = jest.fn();
  const schedule = jest.fn();
  const recovery = createConnectionRecovery({ state, now: () => 10, fallback, schedule });
  recovery.close();
  expect(state).toMatchObject({
    socket: undefined,
    mode: "disconnected",
  });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(schedule).toHaveBeenCalledTimes(1);
});

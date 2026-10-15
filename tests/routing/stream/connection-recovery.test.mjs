import { expect, jest, test } from "@jest/globals";
import { createConnectionRecovery } from "../../../src/routing/stream/connection-recovery.mjs";

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
    disconnectedAt: 10,
    lastReconnectWasPlanned: false,
    plannedReconnect: false,
  });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(schedule).toHaveBeenCalledTimes(1);
});

test("does not schedule fallback after planned or closed socket shutdown", () => {
  const fallback = jest.fn();
  const schedule = jest.fn();
  const planned = { closed: false, plannedReconnect: true, socket: {}, mode: "websocket" };
  createConnectionRecovery({ state: planned, now: () => 1, fallback, schedule }).close();
  expect(planned.lastReconnectWasPlanned).toBe(true);
  expect(fallback).not.toHaveBeenCalled();
  expect(schedule).toHaveBeenCalledTimes(1);
  const closed = { closed: true, socket: {}, mode: "websocket" };
  createConnectionRecovery({ state: closed, now: () => 1, fallback, schedule }).close();
  expect(schedule).toHaveBeenCalledTimes(1);
});

import { expect, jest, test } from "@jest/globals";
import { recoverConnectionClose } from "../../../src/routing/stream-client/reconnect-recovery.mjs";

test("records ordinary closure, falls back, and schedules reconnect", () => {
  const state = { closed: false, plannedReconnect: false };
  const fallback = jest.fn();
  const schedule = jest.fn();
  recoverConnectionClose({ state, now: () => 5, fallback, schedule });
  expect(state).toMatchObject({ disconnectedAt: 5, lastReconnectWasPlanned: false });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(schedule).toHaveBeenCalledTimes(1);
});

test("skips fallback for planned closure and all work after full closure", () => {
  const fallback = jest.fn();
  const schedule = jest.fn();
  const planned = { closed: false, plannedReconnect: true };
  recoverConnectionClose({ state: planned, now: () => 5, fallback, schedule });
  expect(planned.lastReconnectWasPlanned).toBe(true);
  expect(fallback).not.toHaveBeenCalled();
  expect(schedule).toHaveBeenCalledTimes(1);
  recoverConnectionClose({ state: { closed: true }, now: () => 5, fallback, schedule });
  expect(schedule).toHaveBeenCalledTimes(1);
});

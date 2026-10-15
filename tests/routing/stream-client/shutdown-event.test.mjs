import { expect, jest, test } from "@jest/globals";
import { handleShutdownEvent } from "../../../src/routing/stream-client/shutdown-event.mjs";

test("updates the endpoint and reconnect state before fallback and socket close", async () => {
  const events = [];
  const state = {
    activeEndpoint: "http://vip",
    updateHandler: jest.fn(() => events.push("update")),
    socket: { close: jest.fn(() => events.push("close")) },
  };
  const fallback = jest.fn(async () => events.push("fallback"));
  const reconnect = {
    cancel: jest.fn(),
    reset: jest.fn(() => events.push("reset")),
  };
  await expect(
    handleShutdownEvent(
      { type: "routing.shutdown", reconnectDeadlineMs: 50, loadBalancerEndpoint: "http://next" },
      { state, fallback, reconnect, now: () => 10 },
    ),
  ).resolves.toBe(true);
  expect(state.activeEndpoint).toBe("http://next");
  expect(state.reconnectDeadlineAt).toBe(60);
  expect(state.plannedReconnect).toBe(true);
  expect(reconnect.cancel).not.toHaveBeenCalled();
  expect(events).toEqual(["update", "reset", "fallback", "close"]);
});

test("cancels immediate reconnect and accepts an event without optional handlers", async () => {
  const reconnect = { cancel: jest.fn(), reset: jest.fn() };
  const fallback = jest.fn();
  const context = { state: { activeEndpoint: "http://vip" }, fallback, reconnect, now: () => 1 };
  await expect(
    handleShutdownEvent({ type: "routing.shutdown", reconnectDeadlineMs: 0 }, context),
  ).resolves.toBe(true);
  expect(handleShutdownEvent({ type: "routing.update" }, context)).toBe(false);
  expect(reconnect.cancel).toHaveBeenCalledTimes(1);
  expect(fallback).toHaveBeenCalledTimes(1);
});

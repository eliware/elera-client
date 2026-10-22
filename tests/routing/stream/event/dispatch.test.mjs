import { expect, jest, test } from "@jest/globals";
import {
  dispatchRoutingEvent,
  isShutdownEvent,
} from "../../../../src/routing/stream/event/dispatch.mjs";

test("recognizes shutdown event types", () => {
  expect(isShutdownEvent({ type: "routing.shutdown" })).toBe(true);
  expect(isShutdownEvent({ type: "routing.update" })).toBe(false);
});

test("sends ordinary events to the current update handler", async () => {
  const event = { type: "routing.update" };
  const updateHandler = jest.fn();
  const fallback = jest.fn();
  await dispatchRoutingEvent(event, { state: { updateHandler }, fallback });
  expect(updateHandler).toHaveBeenCalledWith(event);
  expect(fallback).not.toHaveBeenCalled();
});

test("delivers topology events before resynchronizing", async () => {
  const calls = [];
  const updateHandler = jest.fn(async () => calls.push("update"));
  const fallback = jest.fn(async () => calls.push("fallback"));
  const event = { type: "routing.topology" };
  await dispatchRoutingEvent(event, { state: { updateHandler }, fallback });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(updateHandler).toHaveBeenCalledWith(event);
  expect(calls).toEqual(["update", "fallback"]);
});

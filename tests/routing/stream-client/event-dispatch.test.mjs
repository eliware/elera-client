import { expect, jest, test } from "@jest/globals";
import { dispatchRoutingEvent } from "../../../src/routing/stream-client/event-dispatch.mjs";

test("sends ordinary events to the current update handler", async () => {
  const event = { type: "routing.update" };
  const updateHandler = jest.fn();
  const fallback = jest.fn();
  await dispatchRoutingEvent(event, { state: { updateHandler }, fallback });
  expect(updateHandler).toHaveBeenCalledWith(event);
  expect(fallback).not.toHaveBeenCalled();
});

test("resynchronizes topology events", async () => {
  const updateHandler = jest.fn();
  const fallback = jest.fn();
  await dispatchRoutingEvent({ type: "routing.topology" }, { state: { updateHandler }, fallback });
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(updateHandler).not.toHaveBeenCalled();
});

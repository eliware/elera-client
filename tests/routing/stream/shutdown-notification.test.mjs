import { expect, jest, test } from "@jest/globals";
import { notifyShutdownUpdate } from "../../../src/routing/stream/shutdown-notification.mjs";

test("sends a shutdown event to the update handler", () => {
  const updateHandler = jest.fn();
  const state = { updateHandler };
  const event = { type: "routing.shutdown" };
  notifyShutdownUpdate(state, event);
  expect(updateHandler).toHaveBeenCalledWith(event);
});

test("accepts state without an update handler", () => {
  expect(() => notifyShutdownUpdate({}, { type: "routing.shutdown" })).not.toThrow();
});

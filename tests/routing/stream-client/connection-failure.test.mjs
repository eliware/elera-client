import { expect, jest, test } from "@jest/globals";
import { createConnectionFailure } from "../../../src/routing/stream-client/connection-failure.mjs";

test("resets connection state and schedules after a constructor error", async () => {
  const state = { connecting: true, socket: {}, mode: "connecting" };
  const error = new Error("socket failed");
  const onError = jest.fn();
  const fallback = jest.fn(async () => {});
  const schedule = jest.fn();
  await createConnectionFailure({ state, fallback, schedule })(error, onError);
  expect(state).toMatchObject({ connecting: false, socket: undefined, mode: "disconnected" });
  expect(onError).toHaveBeenCalledWith(error);
  expect(schedule).toHaveBeenCalledTimes(1);
});

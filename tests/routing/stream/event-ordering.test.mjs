import { expect, jest, test } from "@jest/globals";
import { orderRoutingEvent } from "../../../src/routing/stream/event-ordering.mjs";

test("waits for recovery before it records a gap version", async () => {
  const state = { expectedVersion: 3 };
  const fallback = jest.fn(async () => {});
  const ordering = orderRoutingEvent({ version: 5 }, { state, fallback });
  expect(ordering.accepted).toBe(true);
  await ordering.recovery;
  ordering.complete();
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(state.expectedVersion).toBe(5);
});

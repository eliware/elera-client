import { expect, jest, test } from "@jest/globals";
import { orderRoutingEvent } from "../../../src/routing/stream-client/event-ordering.mjs";

test("rejects stale versions without changing expected version", async () => {
  const state = { expectedVersion: 3 };
  const fallback = jest.fn();
  expect(orderRoutingEvent({ version: 2 }, { state, fallback })).toEqual({ accepted: false });
  expect(state.expectedVersion).toBe(3);
  expect(fallback).not.toHaveBeenCalled();
});

test("resynchronizes version gaps and records the new expected version", async () => {
  const state = { expectedVersion: 3 };
  const fallback = jest.fn(async () => {});
  const ordering = orderRoutingEvent({ version: 5 }, { state, fallback });
  expect(ordering.accepted).toBe(true);
  await ordering.recovery;
  ordering.complete();
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(state.expectedVersion).toBe(5);
});

test("accepts adjacent and unversioned events", async () => {
  const state = { expectedVersion: 3 };
  const fallback = jest.fn();
  expect(orderRoutingEvent({ version: 4 }, { state, fallback })).toEqual({ accepted: true });
  expect(orderRoutingEvent({}, { state, fallback })).toEqual({ accepted: true });
  expect(fallback).not.toHaveBeenCalled();
  const syncState = { expectedVersion: 1 };
  const syncOrdering = orderRoutingEvent({ version: 3 }, { state: syncState, fallback });
  expect(syncOrdering).toMatchObject({ accepted: true });
  await syncOrdering.recovery;
  syncOrdering.complete();
  expect(syncState.expectedVersion).toBe(3);
});

import { expect, test, jest } from "@jest/globals";
import { createRoutingMessageHandler } from "../../../src/routing/stream-client/message-handler.mjs";
import { streamBundle } from "../../../test-fixtures/routing/stream-client.mjs";

test("routes an update and ignores an older version", async () => {
  const state = { expectedVersion: 2, updateHandler: jest.fn() };
  const fallback = jest.fn();
  const onError = jest.fn();
  const handler = createRoutingMessageHandler({
    state,
    fallback,
    reconnect: { cancel: jest.fn(), reset: jest.fn() },
    now: Date.now,
    onError,
  });
  await handler({
    data: JSON.stringify({
      ...streamBundle,
      type: "routing.update",
      version: 1,
      generatedAt: "2099-01-01T00:00:00Z",
    }),
  });
  expect(state.updateHandler).not.toHaveBeenCalled();
  expect(fallback).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});

test("sets a shutdown endpoint and reconnect deadline", async () => {
  const state = { activeEndpoint: "http://vip", updateHandler: jest.fn() };
  const fallback = jest.fn();
  const reconnect = { cancel: jest.fn(), reset: jest.fn() };
  const handler = createRoutingMessageHandler({ state, fallback, reconnect, now: () => 10 });
  await handler({
    data: JSON.stringify({
      type: "routing.shutdown",
      node: "writer",
      reason: "maintenance",
      reconnectDeadlineMs: 50,
      loadBalancerEndpoint: "http://next-vip",
      generatedAt: "2099-01-01T00:00:00Z",
      version: 1,
    }),
  });
  expect(state.activeEndpoint).toBe("http://next-vip");
  expect(state.reconnectDeadlineAt).toBe(60);
  expect(state.plannedReconnect).toBe(true);
  expect(fallback).toHaveBeenCalled();
  expect(reconnect.reset).toHaveBeenCalled();
});

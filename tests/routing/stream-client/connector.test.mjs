import { expect, jest, test } from "@jest/globals";
import { createRoutingConnector } from "../../../src/routing/stream-client/connector.mjs";

test("connects runtime dependencies through the socket helper", async () => {
  const fallback = jest.fn(async () => {});
  const schedule = jest.fn();
  const connect = createRoutingConnector({
    state: { closed: false },
    WebSocketImpl: null,
    getStreamUrl: () => "ws://vip",
    fallback,
    schedule,
    now: Date.now,
  });
  await connect();
  expect(fallback).toHaveBeenCalledTimes(1);
  expect(schedule).toHaveBeenCalledTimes(1);
});

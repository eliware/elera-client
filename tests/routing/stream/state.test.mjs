import { expect, test } from "@jest/globals";
import { createRoutingStreamState } from "../../../src/routing/stream/state.mjs";

test("creates the default disconnected state", () => {
  expect(createRoutingStreamState({ endpoint: "http://vip" })).toEqual({
    socket: undefined,
    closed: false,
    connecting: false,
    heartbeat: undefined,
    expectedVersion: 0,
    updateHandler: undefined,
    mode: "disconnected",
    plannedReconnect: false,
    lastReconnectWasPlanned: false,
    disconnectedAt: undefined,
    reconnectDeadlineAt: undefined,
    activeEndpoint: "http://vip",
    telemetry: undefined,
  });
});

test("sets handlers and telemetry from runtime options", () => {
  const onUpdate = () => {};
  const telemetry = {};
  expect(createRoutingStreamState({ endpoint: "http://db", onUpdate, telemetry })).toMatchObject({
    updateHandler: onUpdate,
    activeEndpoint: "http://db",
    telemetry,
  });
});

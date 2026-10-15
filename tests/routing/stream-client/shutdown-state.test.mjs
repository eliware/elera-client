import { expect, test } from "@jest/globals";
import { applyShutdownState } from "../../../src/routing/stream-client/shutdown-state.mjs";

test("sets the endpoint and reconnect state from a shutdown event", () => {
  const state = { activeEndpoint: "http://vip" };
  applyShutdownState(
    { reconnectDeadlineMs: 50, loadBalancerEndpoint: "http://next" },
    { state, now: () => 10 },
  );
  expect(state).toMatchObject({
    activeEndpoint: "http://next",
    reconnectDeadlineAt: 60,
    plannedReconnect: true,
  });
});

import { expect, jest, test } from "@jest/globals";
import { handleLifecycleRoutingEvent } from "../../../src/client/routing/lifecycle-events.mjs";

test("applies drain and shutdown timeouts to each pool", () => {
  const pool = { drain: jest.fn(), recover: jest.fn() };
  handleLifecycleRoutingEvent(
    { type: "routing.drain", node: "db", drainTimeoutMs: 10 },
    [pool],
    20,
  );
  handleLifecycleRoutingEvent(
    { type: "routing.shutdown", node: "db", reconnectDeadlineMs: 5 },
    [pool],
    20,
  );
  expect(pool.drain).toHaveBeenNthCalledWith(1, "db", 10);
  expect(pool.drain).toHaveBeenNthCalledWith(2, "db", 5);
});

test("uses the default timeout and recovers the addressed node", () => {
  const pool = { drain: jest.fn(), recover: jest.fn() };
  handleLifecycleRoutingEvent({ type: "routing.drain", node: "db" }, [pool], 20);
  handleLifecycleRoutingEvent({ type: "routing.recovery", node: "db" }, [pool], 20);
  expect(pool.drain).toHaveBeenCalledWith("db", 20);
  expect(pool.recover).toHaveBeenCalledWith("db", 20);
});

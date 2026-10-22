import { expect, jest, test } from "@jest/globals";
import { handleLifecycleRoutingEvent } from "../../../../src/client/routing/lifecycle/events.mjs";

test("uses the shutdown reconnect deadline as its drain timeout", () => {
  const pool = { drain: jest.fn(), recover: jest.fn() };
  handleLifecycleRoutingEvent(
    { type: "routing.shutdown", node: "db", reconnectDeadlineMs: 5 },
    [pool],
    20,
  );
  expect(pool.drain).toHaveBeenCalledWith("db", 5);
});

test("uses explicit and default drain timeouts and recovers the addressed node", () => {
  const explicitPool = { drain: jest.fn(), recover: jest.fn() };
  const defaultPool = { drain: jest.fn(), recover: jest.fn() };
  handleLifecycleRoutingEvent(
    { type: "routing.drain", node: "db", drainTimeoutMs: 10 },
    [explicitPool],
    20,
  );
  handleLifecycleRoutingEvent({ type: "routing.drain", node: "db" }, [defaultPool], 20);
  handleLifecycleRoutingEvent({ type: "routing.recovery", node: "db" }, [defaultPool], 20);
  expect(explicitPool.drain).toHaveBeenCalledWith("db", 10);
  expect(defaultPool.drain).toHaveBeenCalledWith("db", 20);
  expect(defaultPool.recover).toHaveBeenCalledWith("db", 20);
});

test("reconciles node availability from a routing topology snapshot", () => {
  const pool = { drain: jest.fn(), recover: jest.fn() };
  handleLifecycleRoutingEvent(
    {
      type: "routing.topology",
      topology: {
        nodes: [
          { nodeId: "ready-db", state: "ready", draining: false },
          { nodeId: "draining-db", state: "ready", draining: true },
          { nodeId: "unready-db", state: "unready", draining: false },
        ],
      },
    },
    [pool],
    20,
  );
  expect(pool.recover).toHaveBeenCalledTimes(1);
  expect(pool.recover).toHaveBeenCalledWith("ready-db", 20);
  expect(pool.drain).toHaveBeenCalledTimes(1);
  expect(pool.drain).toHaveBeenCalledWith("draining-db", 20);
  handleLifecycleRoutingEvent({ type: "routing.topology" }, [pool], 20);
  expect(pool.recover).toHaveBeenCalledTimes(1);
  expect(pool.drain).toHaveBeenCalledTimes(1);
});

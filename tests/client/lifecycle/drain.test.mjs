import { expect, jest, test } from "@jest/globals";
import { createClientDrain } from "../../../src/client/lifecycle/drain.mjs";

test("clamps the timeout and coordinates drain, idle wait, and force close", async () => {
  const pool = {
    drain: jest.fn(),
    waitForIdle: jest.fn(async () => true),
    forceClose: jest.fn(async () => true),
  };
  const drain = createClientDrain({ getPools: () => [pool], defaultTimeout: 50000 });
  const operation = drain("writer", 60000);
  expect(operation).toMatchObject({ host: "writer", timeoutMs: 45000 });
  expect(pool.drain).toHaveBeenCalledWith("writer", 45000);
  await expect(operation.wait()).resolves.toEqual([true]);
  await expect(operation.forceClose()).resolves.toEqual([true]);
});

test("rejects a negative timeout before it drains pools", () => {
  const pool = { drain: jest.fn() };
  const drain = createClientDrain({ getPools: () => [pool], defaultTimeout: 10 });
  expect(() => drain("writer", -1)).toThrow("non-negative");
  expect(pool.drain).not.toHaveBeenCalled();
});

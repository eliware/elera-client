import { expect, jest, test } from "@jest/globals";
import { createDriverPool } from "../../../src/pools/node/driver-pool.mjs";
import { profile } from "../../../test-fixtures/pools/node.mjs";

test("passes driver options and omits acquire timeout and undefined socket paths", () => {
  const createPool = jest.fn();
  createDriverPool(
    { ...profile, options: { acquireTimeout: 10, socketPath: undefined, connectionLimit: 2 } },
    { createPool },
  );
  expect(createPool).toHaveBeenCalledWith(
    expect.objectContaining({ connectionLimit: 2, waitForConnections: true }),
  );
  expect(createPool.mock.calls[0][0]).not.toHaveProperty("acquireTimeout");
  expect(createPool.mock.calls[0][0]).not.toHaveProperty("socketPath");
});

test("preserves an explicitly configured socket path", () => {
  const createPool = jest.fn();
  createDriverPool({ ...profile, options: { socketPath: "/run/mysqld.sock" } }, { createPool });
  expect(createPool.mock.calls[0][0].socketPath).toBe("/run/mysqld.sock");
});

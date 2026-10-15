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
});

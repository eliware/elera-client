import { expect, jest, test } from "@jest/globals";
import { createDriverPool, createDriverPoolCloser } from "../../../src/pools/node/driver-pool.mjs";
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

test("closes the driver pool through its lifecycle callback", async () => {
  const end = jest.fn(async () => {});
  await createDriverPoolCloser({ end })();
  expect(end).toHaveBeenCalledTimes(1);
});

import { expect, jest, test } from "@jest/globals";
import { createNodeAvailability } from "../../../src/pools/node/availability.mjs";
import { createNodePool } from "../../../src/pools/node/index.mjs";
import { driver, profile } from "../../../test-fixtures/pools/node.mjs";

function makeAvailability(initialState = "ready", closed = false) {
  const data = { state: initialState, closed };
  const drain = jest.fn(() => {
    data.state = "draining";
  });
  const availability = createNodeAvailability({
    getState: () => data.state,
    setState: (value) => (data.state = value),
    isClosed: () => data.closed,
    cancelDrain: jest.fn(),
    drain,
  });
  return { drain, availability };
}

test("delegates availability changes to lifecycle drain", () => {
  const { drain, availability } = makeAvailability();
  availability.available = false;
  expect(drain).toHaveBeenCalledTimes(1);
  expect(availability.available).toBe(false);
});

test("node defaults and toggles availability", async () => {
  const node = createNodePool({ profile, mysqlLib: driver() });
  expect(node.available).toBe(true);
  expect(node.failures).toBe(0);
  node.available = false;
  expect(node.available).toBe(false);
  node.available = true;
  expect(node.available).toBe(true);
  await node.close();
});

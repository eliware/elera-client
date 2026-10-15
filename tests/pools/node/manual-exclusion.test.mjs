import { expect, jest, test } from "@jest/globals";
import { createManualExclusion } from "../../../src/pools/node/manual-exclusion.mjs";
import { createNodeAvailability } from "../../../src/pools/node/availability.mjs";
import { createNodeLifecycle } from "../../../src/pools/node/lifecycle.mjs";
import { driver, profile } from "../../../test-fixtures/pools/node.mjs";
import { createNodePool } from "../../../src/pools/node/index.mjs";

test("tracks an explicit manual exclusion and clears it", () => {
  const setState = jest.fn();
  const exclusion = createManualExclusion(setState);
  exclusion.exclude();
  expect(exclusion.active).toBe(true);
  expect(setState).toHaveBeenCalledWith("unavailable");
  exclusion.clear();
  expect(exclusion.active).toBe(false);
});

test("applies and clears manual exclusion through node availability", () => {
  const data = { state: "ready", closed: false };
  const availability = createNodeAvailability({
    getState: () => data.state,
    setState: (value) => (data.state = value),
    isClosed: () => data.closed,
    cancelDrain: jest.fn(),
    drain: jest.fn(() => (data.state = "draining")),
  });
  availability.unavailable = true;
  expect(data.state).toBe("unavailable");
  expect(availability.available).toBe(false);
  availability.unavailable = false;
  expect(availability.available).toBe(true);
});

test("clears manual unavailability through the lifecycle interface", () => {
  const lifecycle = createNodeLifecycle({ onForceClose: jest.fn() });
  lifecycle.unavailable = true;
  expect(lifecycle.available).toBe(false);
  lifecycle.unavailable = false;
  expect(lifecycle.available).toBe(true);
});

test("keeps manual exclusion active after failure quarantine expires", async () => {
  let now = 0;
  const node = createNodePool({ profile, mysqlLib: driver(), now: () => now, quarantineMs: 10 });
  node.available = false;
  now = 100;
  expect(node.available).toBe(false);
  node.available = true;
  expect(node.available).toBe(true);
  await node.close();
});

import { expect, jest, test } from "@jest/globals";
import { createManualExclusion } from "../../../src/pools/node/manual-exclusion.mjs";
import { createNodeAvailability } from "../../../src/pools/node/availability.mjs";
import { createNodeLifecycle } from "../../../src/pools/node/lifecycle.mjs";

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
    now: () => 1,
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
  const lifecycle = createNodeLifecycle({ now: () => 1, onForceClose: jest.fn() });
  lifecycle.unavailable = true;
  expect(lifecycle.available).toBe(false);
  lifecycle.unavailable = false;
  expect(lifecycle.available).toBe(true);
});

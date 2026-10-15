import { expect, jest, test } from "@jest/globals";
import { createNodeAvailability } from "../../../src/pools/node/availability-composition.mjs";

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

test("clears manual exclusion when lifecycle recovery restores availability", () => {
  const { drain, availability } = makeAvailability();
  availability.unavailable = true;
  availability.available = false;
  expect(drain).toHaveBeenCalledTimes(1);
  expect(availability.available).toBe(false);

  availability.available = true;

  expect(availability.available).toBe(true);
});

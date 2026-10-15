import { expect, jest, test } from "@jest/globals";
import { createNodeAvailability } from "../../../src/pools/node-pool/availability.mjs";

function makeAvailability(initialState = "ready", closed = false) {
  const data = { state: initialState, closed };
  const drain = jest.fn(() => {
    data.state = "draining";
  });
  const availability = createNodeAvailability({
    now: () => 1,
    getState: () => data.state,
    setState: (value) => (data.state = value),
    isClosed: () => data.closed,
    cancelDrain: jest.fn(),
    drain,
  });
  return { data, drain, availability };
}

test("sets and clears explicit node unavailability", () => {
  const { data, availability } = makeAvailability();
  availability.unavailable = true;
  expect(data.state).toBe("unavailable");
  expect(availability.available).toBe(false);
  availability.unavailable = false;
  expect(availability.available).toBe(true);
});

test("delegates drain requests and keeps closed nodes unavailable", () => {
  const { data, drain, availability } = makeAvailability();
  availability.available = false;
  expect(drain).toHaveBeenCalledTimes(1);
  data.closed = true;
  availability.available = true;
  expect(availability.recover()).toBe("draining");
  expect(availability.available).toBe(false);
});

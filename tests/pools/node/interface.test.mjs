import { expect, jest, test } from "@jest/globals";
import { createNodeInterface } from "../../../src/pools/node/interface.mjs";

test("exposes node state and delegates lifecycle methods", async () => {
  const state = { failures: 2, unavailableUntil: 0 };
  const lifecycle = {
    available: true,
    closed: false,
    state: "ready",
    active: 1,
    drain: jest.fn(),
    recover: jest.fn(),
    waitForIdle: jest.fn(),
    forceClose: jest.fn(),
    close: jest.fn(async () => {}),
  };
  const methods = { query: jest.fn() };
  const node = createNodeInterface({
    profile: { host: "db", port: 3306, weight: "25" },
    state,
    lifecycle,
    methods,
    health: jest.fn(),
    now: () => 5,
  });
  expect(node).toMatchObject({ host: "db", port: 3306, weight: 25, state: "ready", active: 1 });
  expect(node.query).toBe(methods.query);
  node.available = false;
  expect(lifecycle.available).toBe(false);
  node.available = true;
  expect(state.unavailableUntil).toBe(0);
  expect(node.recover()).toBe("ready");
  await node.close();
  expect(lifecycle.close).toHaveBeenCalledTimes(1);
});

test("keeps explicit unavailability while closed", () => {
  const state = { failures: 0, unavailableUntil: 0 };
  let available = false;
  const lifecycle = {
    get available() {
      return available && !this.closed;
    },
    set available(value) {
      if (!this.closed) available = value;
    },
    closed: true,
    state: "unavailable",
    active: 0,
    drain: jest.fn(),
    recover: jest.fn(),
    waitForIdle: jest.fn(),
    forceClose: jest.fn(),
    close: jest.fn(),
  };
  const node = createNodeInterface({
    profile: { host: "db", port: 3306 },
    state,
    lifecycle,
    methods: {},
    health: jest.fn(),
    now: () => 0,
  });
  node.available = true;
  expect(node.available).toBe(false);
});

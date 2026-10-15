import { expect, test, jest } from "@jest/globals";
import { createBundleRefresh } from "../../../src/client/bundle/refresh.mjs";
import { bundle } from "../../../test-fixtures/client/runtime.mjs";
import { emptyPool, refreshForState } from "../../../test-fixtures/client/bundle/refresh.mjs";

test("keeps equivalent usable pools and rejects an older candidate", async () => {
  const active = { bundleVersion: 3 };
  const primary = { nodes: [{ available: true }] };
  const same = refreshForState(createBundleRefresh, {
    active,
    primary,
    balanced: null,
    equivalent: () => true,
  });
  await expect(same.refresh({ bundleVersion: 3 })).resolves.toEqual({
    bundleVersion: 3,
    refreshRequired: false,
  });
  expect(same.state.primary).toBe(primary);

  const old = refreshForState(createBundleRefresh, {
    active,
    primary,
    balanced: null,
    older: () => true,
  });
  await expect(old.refresh({ bundleVersion: 2 })).resolves.toEqual({
    bundleVersion: 3,
    refreshRequired: false,
  });
});

test("refreshes equivalent bundles when a pool is not usable", async () => {
  const makeCandidate = {
    bundleVersion: 2,
    physicalDatabase: "db",
    credentials: { username: "u", password: "p" },
    writer: { host: "writer", port: 3306 },
    readers: [],
    routes: { balanced: [] },
  };
  const refresh = refreshForState(createBundleRefresh, {
    active: { bundleVersion: 1 },
    primary: emptyPool(),
    balanced: emptyPool(),
    equivalent: () => true,
    usable: (pool) => pool.nodes.length > 0,
  });
  await expect(refresh.refresh(makeCandidate)).resolves.toMatchObject({ bundleVersion: 2 });

  const balancedPool = {
    nodes: [],
    waitForIdle: async () => {},
    close: async () => {},
  };
  const usablePrimary = {
    nodes: [{ available: true, drain: jest.fn() }],
    waitForIdle: async () => {},
    close: async () => {},
  };
  const balancedRefresh = refreshForState(createBundleRefresh, {
    active: { bundleVersion: 1 },
    primary: usablePrimary,
    balanced: balancedPool,
    equivalent: () => true,
    usable: (pool) => pool.nodes.some((node) => node.available),
  });
  await expect(balancedRefresh.refresh(makeCandidate)).resolves.toMatchObject({ bundleVersion: 2 });
});

test("replaces writer and reader pools and drains obsolete pools", async () => {
  const drained = jest.fn();
  const oldPool = {
    nodes: [{ drain: drained }],
    waitForIdle: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
  };
  const active = { bundleVersion: 1 };
  const candidate = {
    bundleVersion: 2,
    physicalDatabase: "physical",
    credentials: { username: "u", password: "p" },
    writer: { host: "writer", port: 3306 },
    readers: [{ host: "reader", port: 3306 }],
    routes: { balanced: [{ host: "reader", port: 3306 }] },
  };
  const result = refreshForState(createBundleRefresh, {
    active,
    primary: oldPool,
    balanced: oldPool,
  });
  await expect(result.refresh(candidate)).resolves.toEqual({
    bundleVersion: 2,
    refreshRequired: false,
  });
  expect(result.state.primary).not.toBe(oldPool);
  expect(result.state.balanced).not.toBe(oldPool);
  expect(drained).toHaveBeenCalled();
});

test("keeps the active bundle and pools when refreshed pool creation fails", async () => {
  const active = { bundleVersion: 1 };
  const primary = { id: "old-primary", nodes: [] };
  const balanced = { id: "old-balanced", nodes: [] };
  const state = refreshForState(createBundleRefresh, {
    active,
    primary,
    balanced,
    makeRoute: (route) => {
      if (route === "balanced") throw new Error("balanced route failed");
      return { id: "new-primary", nodes: [] };
    },
  });
  const candidate = {
    ...bundle,
    bundleVersion: 2,
    writer: { host: "writer", port: 3306 },
    readers: [{ host: "reader", port: 3306 }],
    routes: { ...bundle.routes, balanced: [{ host: "reader", port: 3306 }] },
  };

  await expect(state.refresh(candidate)).rejects.toThrow("balanced route failed");
  expect(state.state.active).toBe(active);
  expect(state.state.primary).toBe(primary);
  expect(state.state.balanced).toBe(balanced);
});

test("removes and drains a balanced pool when the new bundle has no reader", async () => {
  const drain = jest.fn();
  const balanced = {
    nodes: [{ drain }],
    waitForIdle: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
  };
  const state = refreshForState(createBundleRefresh, {
    active: { bundleVersion: 1 },
    primary: { nodes: [], waitForIdle: async () => {}, close: async () => {} },
    balanced,
  });
  await state.refresh({
    bundleVersion: 2,
    physicalDatabase: "db",
    credentials: { username: "u", password: "p" },
    writer: { host: "writer", port: 3306 },
    readers: [],
    routes: { balanced: [] },
  });
  await new Promise((resolve) => setImmediate(resolve));
  expect(state.state.balanced).toBeNull();
  expect(drain).toHaveBeenCalledWith(10);
  expect(balanced.close).toHaveBeenCalledTimes(1);

  const primaryOnly = refreshForState(createBundleRefresh, {
    active: { bundleVersion: 1 },
    primary: emptyPool(),
    balanced: null,
  });
  await primaryOnly.refresh({
    bundleVersion: 2,
    physicalDatabase: "db",
    credentials: { username: "u", password: "p" },
    writer: { host: "writer", port: 3306 },
    readers: [],
    routes: { balanced: [] },
  });
  expect(primaryOnly.state.balanced).toBeNull();
});

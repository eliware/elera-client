import { expect, test, jest } from "@jest/globals";
import { createBundleRefresh } from "../../../src/client/create-db/bundle-refresh.mjs";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

const refreshForState = ({ active, primary, balanced, equivalent, usable, older }) => {
  const state = { active, primary, balanced };
  const refresh = createBundleRefresh({
    validateBundle: (value) => value,
    getBundle: () => state.active,
    setBundle: (value) => (state.active = value),
    getPrimaryConfig: () => ({}),
    setPrimaryConfig: () => {},
    getPrimaryPool: () => state.primary,
    setPrimaryPool: (value) => (state.primary = value),
    getBalancedPool: () => state.balanced,
    setBalancedPool: (value) => (state.balanced = value),
    makeRoute: () => ({ nodes: [] }),
    validateProfile: (value) => value,
    bundleNeedsRefresh: () => false,
    isOlderBundle: older ?? (() => false),
    equivalentPools: equivalent ?? (() => false),
    usablePool: usable ?? (() => true),
    drainTimeoutMs: 10,
    now: () => 0,
  });
  return { refresh, state };
};

test("keeps equivalent usable pools and rejects an older candidate", async () => {
  const active = { bundleVersion: 3 };
  const primary = { nodes: [{ available: true }] };
  const same = refreshForState({
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

  const old = refreshForState({ active, primary, balanced: null, older: () => true });
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
  const refresh = refreshForState({
    active: { bundleVersion: 1 },
    primary: { nodes: [], waitForIdle: async () => {}, close: async () => {} },
    balanced: { nodes: [], waitForIdle: async () => {}, close: async () => {} },
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
  const balancedRefresh = refreshForState({
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
  const result = refreshForState({
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
test("rejects a refreshed bundle without a writer", async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  await expect(
    client.refresh({
      ...bundle,
      writer: undefined,
      routes: { primary: [], balanced: bundle.routes.balanced },
      bundleVersion: 2,
    }),
  ).rejects.toThrow("writer");
  await client.close();
});

test("does not replace a newer bundle with an older resync", async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, bundleVersion: 2 })).resolves.toMatchObject({
    bundleVersion: 2,
  });
  await expect(client.refresh({ ...bundle, bundleVersion: 1 })).resolves.toMatchObject({
    bundleVersion: 2,
  });
  await client.close();
});

test("rejects unversioned refreshes and ignores older bundles", async () => {
  const client = await createDb({ primary: profile, bundle, mysqlLib: driver() });
  await expect(client.refresh({ ...bundle, bundleVersion: 0 })).resolves.toMatchObject({
    bundleVersion: 1,
  });
  await expect(client.refresh({ ...bundle, bundleVersion: undefined })).rejects.toThrow(
    "bundleVersion",
  );
  await client.close();
});
test("replaces writer and reader pools on refresh", async () => {
  const pools = [];
  const mysqlLib = {
    createPool: jest.fn((options) => {
      const pool = {
        options,
        query: jest.fn(async () => [[options.host]]),
        execute: jest.fn(async () => [[options.host]]),
        getConnection: jest.fn(async () => ({ release: jest.fn() })),
        end: jest.fn(async () => {}),
      };
      pools.push(pool);
      return pool;
    }),
  };
  const client = await createDb({ primary: profile, mysqlLib });
  await client.refresh({
    ...bundle,
    bundleVersion: 2,
    writer: { host: "writer-b", port: 3306 },
    failover: [{ host: "writer-c", port: 3306 }],
    readers: [{ host: "reader-b", port: 3306 }],
    routes: {
      primary: [{ host: "writer-b", port: 3306 }],
      balanced: [{ host: "reader-b", port: 3306 }],
    },
  });
  expect(
    client
      .nodeStates()
      .filter((node) => node.route === "primary")
      .map((node) => node.host),
  ).toEqual(["writer-b", "writer-c"]);
  expect(
    client
      .nodeStates()
      .filter((node) => node.route === "balanced")
      .map((node) => node.host),
  ).toEqual(["reader-b"]);
  await client.close();
});

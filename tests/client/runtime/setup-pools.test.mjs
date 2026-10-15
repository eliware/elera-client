import { expect, jest, test } from "@jest/globals";
import { createDbPoolState } from "../../../src/client/runtime/setup-pools.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

test("creates and updates primary pool state without a balanced pool", () => {
  const state = createDbPoolState({
    primaryConfig: profile,
    balancedConfig: undefined,
    bundle: undefined,
    now: () => 0,
    mysqlLib: driver(),
    log: {},
    quarantineMs: 1,
    routing: "auto",
  });
  expect(state.getPools()).toHaveLength(1);
  expect(state.getBalancedPool()).toBeNull();
  const primaryPool = {};
  const primaryConfig = { ...profile, host: "next" };
  state.setPrimaryPool(primaryPool);
  state.setPrimaryConfig(primaryConfig);
  state.setBundle(bundle);
  expect(state.getPrimaryPool()).toBe(primaryPool);
  expect(state.getPrimaryConfig()).toBe(primaryConfig);
  expect(state.getBundle()).toBe(bundle);
});

test("creates balanced pools from bundle routes and updates telemetry context", () => {
  const setContext = jest.fn();
  const state = createDbPoolState({
    primaryConfig: profile,
    balancedConfig: undefined,
    bundle,
    now: () => 0,
    mysqlLib: driver(),
    log: {},
    quarantineMs: 1,
    routing: "auto",
    metrics: { setContext },
  });
  expect(state.getPools()).toHaveLength(2);
  const updated = { ...bundle, bundleVersion: 2 };
  state.setBundle(updated);
  const balancedPool = {};
  state.setBalancedPool(balancedPool);
  expect(state.getBalancedPool()).toBe(balancedPool);
  expect(setContext).toHaveBeenCalledWith({
    application: "app",
    credentialName: undefined,
    database: "app",
    scopes: undefined,
  });
});

test("creates a balanced pool from an explicit profile", () => {
  const state = createDbPoolState({
    primaryConfig: profile,
    balancedConfig: { ...profile, host: "read" },
    bundle: undefined,
    now: () => 0,
    mysqlLib: driver(),
    log: {},
    quarantineMs: 1,
    routing: "auto",
  });
  expect(state.getPools()).toHaveLength(2);
});

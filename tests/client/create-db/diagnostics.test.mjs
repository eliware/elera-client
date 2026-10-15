import { expect, test } from "@jest/globals";
import { createDb } from "../../../src/client/create-db/index.mjs";
import { createDiagnostics } from "../../../src/client/create-db/diagnostics.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

test("reports node states and route availability from pool state", async () => {
  const primary = {
    nodes: [{ host: "db", port: 3306, state: "ready", active: 0, available: true }],
    health: async () => [{ ok: true }],
  };
  const diagnostics = createDiagnostics({
    getPools: () => [primary],
    getPrimaryPool: () => primary,
    getBalancedPool: () => null,
    now: () => 0,
  });
  expect(diagnostics.nodeStates()).toMatchObject([{ route: "primary", host: "db" }]);
  expect(diagnostics.availability()).toEqual({
    state: "available",
    routes: { primary: true, balanced: false },
  });
  await expect(diagnostics.health()).resolves.toMatchObject({ ok: true, route: "primary" });
});

test("reports cluster-unavailable when every multi-node primary route is unavailable", async () => {
  const client = await createDb({
    primary: profile,
    bundle: {
      ...bundle,
      failover: [{ host: "backup", port: 3306 }],
      routes: {
        ...bundle.routes,
        primary: [
          { host: "db", port: 3306 },
          { host: "backup", port: 3306 },
        ],
      },
    },
    mysqlLib: driver(),
  });
  client.drain("db");
  client.drain("backup");
  expect(client.availability().state).toBe("cluster-unavailable");
  await client.close();
});

test("reports standalone drain state without claiming the database operation is cancelled", async () => {
  const client = await createDb({
    primary: profile,
    bundle: {
      ...bundle,
      writer: { host: "db", port: 3306 },
      failover: [],
      routes: { primary: [{ host: "db", port: 3306 }], balanced: [] },
    },
    mysqlLib: driver(),
  });
  client.drain("db");
  expect(client.availability()).toMatchObject({
    state: "standalone-unavailable",
    routes: { primary: false },
  });
  await client.close();
});

test("reports an unavailable standalone route as a server error", async () => {
  const client = await createDb({
    primary: profile,
    bundle: {
      ...bundle,
      writer: { host: "only-node", port: 3306 },
      routes: { primary: [{ host: "only-node", port: 3306 }], balanced: [] },
    },
    mysqlLib: driver(),
  });
  client.drain("only-node", 1000);
  await expect(client.query("SELECT 1", undefined, { route: "primary" })).rejects.toMatchObject({
    code: "SERVER_UNAVAILABLE",
  });
  await client.close();
});

test("changes availability for a selected route without exposing pool internals", async () => {
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    mysqlLib: driver(),
  });
  client.setNodeAvailability("primary", "db", false);
  await expect(client.query("UPDATE app SET x=1")).rejects.toThrow("no eligible");
  client.setNodeAvailability("primary", "db", true);
  await expect(client.query("UPDATE app SET x=1")).resolves.toBeTruthy();
  client.setNodeAvailability("balanced", "read", false);
  await expect(client.query("SELECT 1", [], { route: "balanced" })).rejects.toThrow("no eligible");
  client.setNodeAvailability("balanced", "read", true);
  await client.close();
});
test("drains the balanced pool when a strict update removes readers", async () => {
  const client = await createDb({
    primary: profile,
    balanced: { host: "read", port: 3306 },
    bundle,
    mysqlLib: driver(),
  });
  await client.refresh({
    ...bundle,
    readers: [],
    routes: { primary: bundle.routes.primary, balanced: [] },
    bundleVersion: 2,
  });
  expect(client.nodeStates().filter((node) => node.route === "balanced")).toEqual([]);
  await client.close();
});

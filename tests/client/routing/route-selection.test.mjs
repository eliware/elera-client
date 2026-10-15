import { expect, test } from "@jest/globals";
import { createRouteSelection } from "../../../src/client/routing/route-selection.mjs";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/create-db.mjs";

const primary = { name: "primary" };
const balanced = { name: "balanced" };

test("selects primary by default and balanced for safe reads", () => {
  const selection = createRouteSelection({
    primaryPool: primary,
    balancedPool: balanced,
    routing: "auto",
  });
  expect(selection.choose("UPDATE items SET value = 1")).toBe(primary);
  expect(selection.choose("SELECT * FROM items")).toBe(balanced);
  expect(selection.requestedRoute("SELECT 1")).toBe("balanced");
});

test("honors explicit routes and explicit connections", () => {
  const connection = { name: "connection" };
  const selection = createRouteSelection({
    primaryPool: primary,
    balancedPool: balanced,
    routing: "primary",
  });
  expect(selection.choose("SELECT 1")).toBe(primary);
  expect(selection.choose("SELECT 1", { route: "balanced" })).toBe(balanced);
  expect(selection.choose("SELECT 1", { connection, route: "balanced" })).toBe(connection);
  expect(selection.requestedRoute("UPDATE items SET value = 1", { route: "balanced" })).toBe(
    "balanced",
  );
});

test("falls back to the primary pool when no balanced pool exists", () => {
  const selection = createRouteSelection({
    primaryPool: primary,
    balancedPool: null,
    routing: "auto",
  });
  expect(selection.choose("SELECT 1")).toBe(primary);
  expect(
    selection.isSafeBalancedRetry("SELECT 1", { route: "balanced" }, { retryable: true }),
  ).toBe(false);
});

test("only allows retryable balanced classified reads to retry", () => {
  const selection = createRouteSelection({
    primaryPool: primary,
    balancedPool: balanced,
    routing: "auto",
  });
  expect(selection.isSafeBalancedRetry("SELECT 1", undefined, { retryable: true })).toBe(true);
  expect(selection.isSafeBalancedRetry("SELECT 1", { route: "primary" }, { retryable: true })).toBe(
    false,
  );
  expect(
    selection.isSafeBalancedRetry(
      "UPDATE items SET value = 1",
      { route: "balanced" },
      { retryable: true },
    ),
  ).toBe(false);
  expect(
    selection.isSafeBalancedRetry("SELECT 1", { route: "balanced" }, { retryable: false }),
  ).toBe(false);
});

test("reports cluster unavailability when all primary nodes drain", async () => {
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

test("reports a standalone drain and maps unavailable queries to a server error", async () => {
  const client = await createDb({
    primary: profile,
    bundle: {
      ...bundle,
      writer: { host: "only-node", port: 3306 },
      failover: [],
      routes: { primary: [{ host: "only-node", port: 3306 }], balanced: [] },
    },
    mysqlLib: driver(),
  });
  client.drain("only-node", 1000);
  expect(client.availability()).toMatchObject({
    state: "standalone-unavailable",
    routes: { primary: false },
  });
  await expect(client.query("SELECT 1", undefined, { route: "primary" })).rejects.toMatchObject({
    code: "SERVER_UNAVAILABLE",
  });
  await client.close();
});

test("changes availability for primary and balanced routes", async () => {
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

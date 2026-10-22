import "../../../test-fixtures/silence-default-logger.mjs";
import { expect, test } from "@jest/globals";
import { getAvailability } from "../../../src/client/diagnostics/availability.mjs";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { bundle, driver, profile } from "../../../test-fixtures/client/runtime.mjs";

test("classifies primary and balanced availability", () => {
  expect(
    getAvailability([
      { route: "primary", available: false },
      { route: "primary", available: false },
      { route: "balanced", available: true },
    ]),
  ).toEqual({
    state: "cluster-unavailable",
    routes: { primary: false, balanced: true },
  });
});

test("classifies a single unavailable primary node", () => {
  expect(getAvailability([{ route: "primary", available: false }]).state).toBe(
    "standalone-unavailable",
  );
});

test("reports drained primary nodes as unavailable", async () => {
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

test("maps standalone drain and node exclusion to unavailable query errors", async () => {
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

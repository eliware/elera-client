import { expect, test, jest } from "@jest/globals";
import { exposeManagedClient } from "../../../src/client/managed/public-api.mjs";
import { makeManagedClient } from "../../../test-fixtures/client/managed.mjs";

test("exposes only the managed mysql2-compatible client surface", () => {
  const client = {
    query: jest.fn(),
    execute: jest.fn(),
    getConnection: jest.fn(),
    probe: jest.fn(),
    secret: "hidden",
  };
  const end = jest.fn();
  const exposed = exposeManagedClient(client, end);
  expect(Object.keys(exposed).sort()).toEqual([
    "end",
    "execute",
    "getConnection",
    "probe",
    "query",
  ]);
  expect(exposed.query).toBe(client.query);
  expect(exposed.end).toBe(end);
  expect(exposed.secret).toBeUndefined();
});

test("does not expose routing or credential controls from the package", async () => {
  const { client } = await makeManagedClient();
  expect(Object.keys(client).sort()).toEqual(["end", "execute", "getConnection", "probe", "query"]);
  for (const name of [
    "bundle",
    "refresh",
    "drain",
    "nodeStates",
    "setNodeAvailability",
    "availability",
    "health",
    "close",
    "telemetry",
  ])
    expect(client).not.toHaveProperty(name);
  expect(JSON.stringify(client)).not.toMatch(/credentials|routes|writer|readers/);
  await client.end();
});

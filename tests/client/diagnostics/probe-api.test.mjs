import { expect, jest, test } from "@jest/globals";
import { createProbeApi } from "../../../src/client/diagnostics/probe-api.mjs";

test("adapts client query and connection methods to the probe workflow", async () => {
  const query = jest.fn(async () => ["rows"]);
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  const probe = createProbeApi({
    routeFor: jest.fn(() => "primary"),
    execution: { query },
    getPrimaryPool: () => ({ choose: () => ({ getConnection: async () => connection }) }),
  });
  await expect(probe()).resolves.toMatchObject({ ok: true, result: ["rows"] });
  expect(query).toHaveBeenCalledWith("SELECT 1", undefined, { route: "primary" });
});

test("uses configured routing for probe requests", async () => {
  const query = jest.fn(async () => []);
  const connection = { beginTransaction: jest.fn(), rollback: jest.fn(), release: jest.fn() };
  const routeFor = jest.fn((_sql, routing) => routing);
  await createProbeApi({
    routeFor,
    execution: { query },
    getPrimaryPool: () => ({ choose: () => ({ getConnection: async () => connection }) }),
    routing: "primary",
  })();
  expect(routeFor).toHaveBeenCalledWith("SELECT 1", "primary");
});

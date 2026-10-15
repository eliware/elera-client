import { expect, jest, test } from "@jest/globals";
import { createDb } from "../../../src/client/runtime/index.mjs";
import { createClientTelemetry } from "../../../src/client/telemetry/context.mjs";
import { driver, profile } from "../../../test-fixtures/client/create-db.mjs";

test("collects telemetry and starts it with the routing stream", async () => {
  expect(createClientTelemetry({ telemetry: undefined })).toBeUndefined();
  const client = await createDb({ primary: profile, mysqlLib: driver(), telemetry: true });
  const stream = {
    connect: jest.fn(async () => {}),
    setOnUpdate: jest.fn(),
    sendTelemetry: jest.fn(),
  };
  await client.attachRoutingStream(stream);
  await client.query("SELECT 1");
  expect(client.telemetry.snapshot().queries).toBe(1);
  await client.close();
});
test("supports an injected telemetry sink", async () => {
  const telemetry = { begin: jest.fn(), record: jest.fn(), start: jest.fn(), stop: jest.fn() };
  const client = await createDb({ primary: profile, mysqlLib: driver(), telemetry });
  await client.query("SELECT 1");
  await client.attachRoutingStream({ connect: jest.fn(async () => {}), setOnUpdate: jest.fn() });
  await client.close();
  expect(telemetry.start).toHaveBeenCalled();
  expect(telemetry.stop).toHaveBeenCalled();
});
test("records elapsed latency on successful and failed queries", async () => {
  let clock = 10;
  const telemetry = {
    begin: jest.fn(() => clock),
    record: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  let calls = 0;
  const query = jest.fn(async () => {
    calls += 1;
    if (calls > 1) {
      clock = 14;
      throw new Error("query failed");
    }
    clock = 13;
    return [["ok"]];
  });
  const client = await createDb({
    primary: profile,
    mysqlLib: driver({ query }),
    telemetry,
    now: () => clock,
  });
  await client.query("SELECT 1");
  await expect(client.query("SELECT 1")).rejects.toThrow("query failed");
  expect(telemetry.record).toHaveBeenCalledWith({ latencyMs: 3, route: "balanced" });
  expect(
    telemetry.record.mock.calls.some(
      ([entry]) => entry.failed === true && entry.latencyMs > 0 && entry.route === "balanced",
    ),
  ).toBe(true);
  await client.close();
});
test("records execute and transaction operations in telemetry", async () => {
  const telemetry = {
    begin: jest.fn(() => 10),
    record: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  const client = await createDb({ primary: profile, mysqlLib: driver(), telemetry, now: () => 14 });
  await client.execute("INSERT INTO app VALUES (?)", ["x"]);
  await client.transaction(async (tx) => tx.query("SELECT 1"));
  expect(telemetry.begin).toHaveBeenCalledTimes(2);
  expect(telemetry.record).toHaveBeenCalledTimes(2);
  await client.close();
});

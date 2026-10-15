import { expect, test } from "@jest/globals";
import { createManagedDependencies } from "../../../src/client/managed/options.mjs";

test("passes supported dependencies to the managed setup", () => {
  const options = {
    mysqlLib: {},
    log: {},
    routing: "primary",
    quarantineMs: 4,
    drainTimeoutMs: 5,
    now: () => 6,
    telemetry: false,
  };
  expect(createManagedDependencies(options)).toEqual(options);
});

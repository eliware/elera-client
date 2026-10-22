import { expect, jest, test } from "@jest/globals";
import { logClientCreated } from "../../../../src/client/runtime/setup/log.mjs";

test("logs client routing and balanced pool state", () => {
  const debug = jest.fn();
  const info = jest.fn();
  const metadata = { operation: "client.create", balancedPool: true, routing: "auto" };
  logClientCreated({ debug, info }, { getBalancedPool: () => ({}), routing: "auto" });
  expect(info).toHaveBeenCalledWith("Managed database client ready", metadata);
  expect(debug).toHaveBeenCalledWith("SQL client created", metadata);
});

test("logs when no balanced pool exists", () => {
  const debug = jest.fn();
  const info = jest.fn();
  logClientCreated({ debug, info }, { getBalancedPool: () => undefined, routing: "primary" });
  expect(debug).toHaveBeenCalledWith("SQL client created", {
    operation: "client.create",
    balancedPool: false,
    routing: "primary",
  });
  expect(info).toHaveBeenCalledWith("Managed database client ready", {
    operation: "client.create",
    balancedPool: false,
    routing: "primary",
  });
});

test("accepts a logger without a debug method", () => {
  expect(() =>
    logClientCreated({}, { getBalancedPool: () => undefined, routing: "primary" }),
  ).not.toThrow();
});

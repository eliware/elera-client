import { expect, jest, test } from "@jest/globals";
import { logClientCreated } from "../../../../src/client/runtime/setup/log.mjs";

test("logs client routing and balanced pool state", () => {
  const debug = jest.fn();
  logClientCreated({ debug }, { getBalancedPool: () => ({}), routing: "auto" });
  expect(debug).toHaveBeenCalledWith("SQL client created", { balanced: true, routing: "auto" });
});

test("logs when no balanced pool exists", () => {
  const debug = jest.fn();
  logClientCreated({ debug }, { getBalancedPool: () => undefined, routing: "primary" });
  expect(debug).toHaveBeenCalledWith("SQL client created", {
    balanced: false,
    routing: "primary",
  });
});

test("accepts a logger without a debug method", () => {
  expect(() =>
    logClientCreated({}, { getBalancedPool: () => undefined, routing: "primary" }),
  ).not.toThrow();
});

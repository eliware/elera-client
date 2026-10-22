import { expect, test, jest } from "@jest/globals";
import { logQuarantine } from "../../../src/pools/node/quarantine-log.mjs";

test("logs the quarantine code without exposing the error message", () => {
  const warn = jest.fn();
  const error = Object.assign(new Error("private-value"), { code: "ECONNRESET" });

  logQuarantine({ warn }, error);

  expect(warn).toHaveBeenCalledWith("SQL node quarantined", {
    operation: "sql.node.quarantine",
    outcome: "quarantined",
    errorCode: "ECONNRESET",
  });
  expect(JSON.stringify(warn.mock.calls)).not.toContain("private-value");
});

test("does not require a logger", () => {
  expect(() => logQuarantine(undefined, { code: "ECONNRESET" })).not.toThrow();
});

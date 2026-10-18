import { expect, test } from "@jest/globals";
import { normalizeDriverOptions } from "../../../../src/pools/node/driver/options.mjs";

test.each([
  [{ acquireTimeout: 10, connectionLimit: 2 }, { connectionLimit: 2 }],
  [{ socketPath: undefined }, {}],
  [{ socketPath: "/run/mysqld.sock" }, { socketPath: "/run/mysqld.sock" }],
])("normalizes driver options %j", (input, expected) => {
  expect(normalizeDriverOptions(input)).toEqual(expected);
});

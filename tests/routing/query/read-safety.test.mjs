import { expect, test } from "@jest/globals";
import { isSafeRead } from "../../../src/routing/query/read-safety.mjs";

test.each(["SELECT 1", "SHOW STATUS", "DESCRIBE users", "DESC users", "EXPLAIN SELECT 1"])(
  "allows safe read statement %s",
  (statement) => expect(isSafeRead(statement)).toBe(true),
);

test.each([
  "UPDATE users SET active=1",
  "SELECT * FROM users FOR UPDATE",
  "SELECT * FROM users LOCK IN SHARE MODE",
  "SELECT * INTO OUTFILE '/tmp/users'",
  "SELECT * INTO DUMPFILE '/tmp/users'",
  "CALL update_users()",
])("rejects unsafe statement %s", (statement) => expect(isSafeRead(statement)).toBe(false));

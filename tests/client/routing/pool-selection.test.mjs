import { expect, test } from "@jest/globals";
import { createPoolSelection } from "../../../src/client/routing/pool-selection.mjs";

test("builds route selection from the current pool state", () => {
  const primary = {};
  const balanced = {};
  let currentPrimary = primary;
  const selection = createPoolSelection({
    getPrimaryPool: () => currentPrimary,
    getBalancedPool: () => balanced,
    routing: "auto",
  });
  expect(selection().choose("UPDATE app SET x=1")).toBe(primary);
  currentPrimary = {};
  expect(selection().choose("UPDATE app SET x=1")).toBe(currentPrimary);
});
test("uses primary when the current pool state has no balanced pool", () => {
  const primary = {};
  const selection = createPoolSelection({
    getPrimaryPool: () => primary,
    getBalancedPool: () => null,
    routing: "auto",
  });
  expect(selection().choose("SELECT 1")).toBe(primary);
});

import { expect, test } from "@jest/globals";
import { createNodeSelector } from "../../../src/pools/route-pool/selection.mjs";

test("selects preferred and weighted nodes and rejects empty pools", () => {
  const first = { available: true, weight: 0 };
  const second = { available: true, weight: 2 };
  expect(createNodeSelector([first, second], { preferred: true }).choose()).toBe(first);
  const select = createNodeSelector([first, second], { unavailableError: Error });
  expect(select.choose()).toBe(second);
  expect(createNodeSelector([first], { unavailableError: Error }).choose()).toBe(first);
  expect(() => createNodeSelector([], { unavailableError: Error }).choose()).toThrow(
    "no eligible SQL nodes available",
  );
});

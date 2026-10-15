import { expect, jest, test } from "@jest/globals";
import { createManualExclusion } from "../../../src/pools/node/manual-exclusion.mjs";

test("tracks an explicit manual exclusion and clears it", () => {
  const setState = jest.fn();
  const exclusion = createManualExclusion(setState);
  exclusion.exclude();
  expect(exclusion.active).toBe(true);
  expect(setState).toHaveBeenCalledWith("unavailable");
  exclusion.clear();
  expect(exclusion.active).toBe(false);
});

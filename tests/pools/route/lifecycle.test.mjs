import { expect, jest, test } from "@jest/globals";
import { createPoolLifecycle } from "../../../src/pools/route/lifecycle.mjs";

test("applies route state and closes the selected nodes", async () => {
  const first = {
    host: "a",
    drain: jest.fn(() => "draining"),
    recover: jest.fn(() => "ready"),
    waitForIdle: jest.fn(async () => true),
    forceClose: jest.fn(async () => {}),
    close: jest.fn(async () => {}),
  };
  const second = { ...first, host: "b" };
  const lifecycle = createPoolLifecycle([first, second]);
  lifecycle.setAvailability("a", false);
  expect(first.available).toBe(false);
  expect(second.available).toBeUndefined();
  expect(lifecycle.drain("a", 5)).toEqual(["draining"]);
  expect(lifecycle.recover("b")).toEqual(["ready"]);
  await expect(lifecycle.waitForIdle(5)).resolves.toEqual([true, true]);
  await lifecycle.forceClose("a");
  await lifecycle.close();
  expect(first.close).toHaveBeenCalled();
  expect(second.close).toHaveBeenCalled();
});

import { expect, test } from "@jest/globals";
import { createNodeActivity } from "../../../src/pools/node/activity.mjs";

test("counts active work and resolves idle waits", async () => {
  const activity = createNodeActivity();
  activity.begin();
  const idle = activity.waitForIdle(100);
  expect(activity.active).toBe(1);
  activity.end();
  await expect(idle).resolves.toBe(true);
  expect(activity.active).toBe(0);
});

test("times out and clears an idle waiter", async () => {
  const activity = createNodeActivity();
  activity.begin();
  await expect(activity.waitForIdle(1)).resolves.toBe(false);
  activity.end();
  await expect(activity.waitForIdle(1)).resolves.toBe(true);
});

test("does not allow the active count below zero", () => {
  const activity = createNodeActivity();
  activity.end();
  expect(activity.active).toBe(0);
});

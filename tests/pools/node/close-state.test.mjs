import { expect, jest, test } from "@jest/globals";
import { createNodeCloseState } from "../../../src/pools/node/close-state.mjs";

test("marks a node closed and closes it once", async () => {
  const markClosed = jest.fn();
  const onForceClose = jest.fn(async () => {});
  const state = createNodeCloseState({ markClosed, onForceClose });

  await state.close();
  await state.close();

  expect(state.closed).toBe(true);
  expect(markClosed).toHaveBeenCalledTimes(1);
  expect(onForceClose).toHaveBeenCalledTimes(1);
  await state.close();
});

test("allows a failed driver close to retry", async () => {
  const onForceClose = jest
    .fn()
    .mockRejectedValueOnce(new Error("driver close failed"))
    .mockResolvedValue();
  const state = createNodeCloseState({ markClosed: jest.fn(), onForceClose });
  await expect(state.close()).rejects.toThrow("driver close failed");
  expect(state.closed).toBe(false);
  await state.close();
  expect(state.closed).toBe(true);
  expect(onForceClose).toHaveBeenCalledTimes(2);
});

test("shares an in-flight driver close", async () => {
  let finish;
  const onForceClose = jest.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const state = createNodeCloseState({ markClosed: jest.fn(), onForceClose });
  const first = state.close();
  const second = state.close();
  expect(first).toBe(second);
  await Promise.resolve();
  finish();
  await first;
  expect(onForceClose).toHaveBeenCalledTimes(1);
});

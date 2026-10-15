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
});

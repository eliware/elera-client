import { expect, jest, test } from "@jest/globals";
import { createManagedShutdown } from "../../../src/client/managed/shutdown.mjs";

test("detaches the stream before close and runs shutdown once", async () => {
  const events = [];
  const end = createManagedShutdown(
    jest.fn(async () => events.push("detach")),
    jest.fn(async () => events.push("close")),
  );
  await Promise.all([end(), end()]);
  expect(events).toEqual(["detach", "close"]);
});

test("closes the client when no stream detach callback exists", async () => {
  const close = jest.fn();
  await createManagedShutdown(undefined, close)();
  expect(close).toHaveBeenCalledTimes(1);
});

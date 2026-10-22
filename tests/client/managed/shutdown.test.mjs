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

test("allows shutdown to retry after detach or close fails", async () => {
  const detach = jest.fn().mockRejectedValueOnce(new Error("detach failed")).mockResolvedValue();
  const close = jest.fn();
  const end = createManagedShutdown(detach, close);
  await expect(end()).rejects.toThrow("detach failed");
  expect(close).toHaveBeenCalledTimes(1);
  await end();
  expect(detach).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledTimes(2);
});

test("retries the client close after it rejects", async () => {
  const close = jest.fn().mockRejectedValueOnce(new Error("close failed")).mockResolvedValue();
  const end = createManagedShutdown(undefined, close);
  await expect(end()).rejects.toThrow("close failed");
  await end();
  expect(close).toHaveBeenCalledTimes(2);
});

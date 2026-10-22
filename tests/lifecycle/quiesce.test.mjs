import { expect, jest, test } from "@jest/globals";
import { createQuiesceController } from "../../src/lifecycle/quiesce.mjs";
test("blocks new work and waits for active work to finish", async () => {
  const q = createQuiesceController();
  const leave = q.enter();
  const pending = q.begin();
  leave();
  await pending;
  expect(q.state().state).toBe("quiesced");
  expect(() => q.enter()).toThrow("quiesced");
  await q.end();
  expect(q.state().state).toBe("open");
});
test("closes the underlying client after quiescing", async () => {
  let closed = false;
  const q = createQuiesceController({
    close: async () => {
      closed = true;
    },
  });
  await q.begin();
  await q.close();
  expect(closed).toBe(true);
  expect(q.state().state).toBe("closed");
});

test("blocks new work and waits for active work before closing", async () => {
  jest.useFakeTimers();
  let finishClose;
  const close = jest.fn(
    () =>
      new Promise((resolve) => {
        finishClose = resolve;
      }),
  );
  const q = createQuiesceController({ close });
  const leave = q.enter();
  const closing = q.close();
  expect(q.state().state).toBe("quiescing");
  expect(() => q.enter()).toThrow("quiesced");
  expect(close).not.toHaveBeenCalled();
  leave();
  await jest.advanceTimersByTimeAsync(10);
  expect(close).toHaveBeenCalledTimes(1);
  finishClose();
  await closing;
  expect(q.state().state).toBe("closed");
  jest.useRealTimers();
});

test("shares close work and permits retry after a close failure", async () => {
  const close = jest.fn().mockRejectedValueOnce(new Error("close failed")).mockResolvedValue();
  const q = createQuiesceController({ close });
  const first = q.close();
  const concurrent = q.close();
  expect(first).toBe(concurrent);
  await expect(first).rejects.toThrow("close failed");
  expect(q.state().state).toBe("quiesced");
  await q.close();
  expect(close).toHaveBeenCalledTimes(2);
  expect(q.state().state).toBe("closed");
  await q.end();
  expect(q.state().state).toBe("closed");
});

test("shares an active quiesce wait", async () => {
  const q = createQuiesceController();
  const leave = q.enter();
  const first = q.begin();
  const second = q.begin();
  leave();
  await Promise.all([first, second]);
  expect(q.state().state).toBe("quiesced");
});
test("publishes lifecycle changes when a listener is provided", async () => {
  const changes = [];
  const q = createQuiesceController({ onChange: (state) => changes.push(state) });
  const leave = q.enter();
  leave();
  leave();
  await q.begin();
  await q.end();
  await q.close();
  expect(changes).toEqual(["quiescing", "quiesced", "open", "quiescing", "quiesced", "closed"]);
});

export function createDrainTimer({
  onExpire,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
}) {
  let timer;
  return {
    schedule(timeout) {
      if (timer) clearTimeoutImpl(timer);
      timer = setTimeoutImpl(onExpire, timeout);
      timer.unref?.();
      return timer;
    },
    clear() {
      if (timer) clearTimeoutImpl(timer);
      timer = undefined;
    },
  };
}

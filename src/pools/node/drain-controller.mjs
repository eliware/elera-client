export function createDrainController({
  forceClose,
  setTimeoutImpl = setTimeout,
  clearTimeoutImpl = clearTimeout,
}) {
  let timer;
  return {
    drain(timeout) {
      if (timer) clearTimeoutImpl(timer);
      timer = setTimeoutImpl(() => void forceClose(), timeout);
      timer.unref?.();
      return timer;
    },
    cancel() {
      if (timer) clearTimeoutImpl(timer);
      timer = undefined;
    },
  };
}

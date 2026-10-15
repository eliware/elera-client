export function createTelemetryEmitter({
  snapshot,
  intervalMs,
  setIntervalImpl,
  clearIntervalImpl,
}) {
  let timer;
  return {
    start(stream) {
      if (timer) return;
      timer = setIntervalImpl(() => stream.sendTelemetry?.(snapshot()), intervalMs);
      timer.unref?.();
    },
    stop() {
      if (timer) clearIntervalImpl(timer);
      timer = undefined;
    },
  };
}

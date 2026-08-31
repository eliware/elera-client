export function createReconnectPolicy({ reconnectMs = 1000, maxReconnectMs = 30000, now = () => Date.now(), isClosed, getDeadline, scheduleConnect }) {
  let timer;
  let delay = reconnectMs;
  const schedule = () => {
    const deadline = getDeadline();
    if (isClosed() || timer || (deadline !== undefined && now() >= deadline)) return;
    const wait = Math.min(delay, Math.max(0, deadline === undefined ? delay : deadline - now()));
    timer = setTimeout(() => { timer = undefined; void scheduleConnect(); }, wait);
    timer.unref?.();
    delay = Math.min(maxReconnectMs, delay * 2);
  };
  const reset = () => { delay = reconnectMs; };
  const cancel = () => { clearTimeout(timer); timer = undefined; };
  return { schedule, reset, cancel };
}

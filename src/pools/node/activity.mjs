export function createNodeActivity() {
  let active = 0;
  const idleWaiters = new Set();
  const begin = () => {
    active += 1;
  };
  const end = () => {
    active = Math.max(0, active - 1);
    if (!active) {
      for (const resolve of idleWaiters) resolve();
      idleWaiters.clear();
    }
  };
  const waitForIdle = async (timeout) => {
    if (!active) return true;
    let timer;
    let finish;
    const idle = new Promise((resolve) => {
      finish = resolve;
      idleWaiters.add(resolve);
    });
    await Promise.race([idle, new Promise((resolve) => (timer = setTimeout(resolve, timeout)))]);
    clearTimeout(timer);
    idleWaiters.delete(finish);
    return active === 0;
  };
  return {
    begin,
    end,
    waitForIdle,
    get active() {
      return active;
    },
  };
}

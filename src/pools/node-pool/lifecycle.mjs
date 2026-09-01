export function createNodeLifecycle({ now, timeoutMs = 45000, onForceClose }) {
  let state = 'ready'; let active = 0; const idleWaiters = new Set(); let drainTimer; let forcedUnavailable = false;
  const begin = () => { active += 1; }; const end = () => { active = Math.max(0, active - 1); if (!active) { for (const resolve of idleWaiters) resolve(); idleWaiters.clear(); } };
  const drain = (timeout = timeoutMs) => { state = 'draining'; forcedUnavailable = true; clearTimeout(drainTimer); drainTimer = setTimeout(() => { void onForceClose(); }, timeout); drainTimer.unref?.(); return { state, active }; };
  const waitForIdle = async (timeout = timeoutMs) => { if (!active) return true; let timer; await Promise.race([new Promise((resolve) => idleWaiters.add(resolve)), new Promise((resolve) => { timer = setTimeout(resolve, timeout); })]); clearTimeout(timer); return active === 0; };
  const recover = () => { clearTimeout(drainTimer); drainTimer = undefined; state = 'ready'; forcedUnavailable = false; return state; };
  return { begin, end, drain, waitForIdle, recover, clear: () => clearTimeout(drainTimer), get active() { return active; }, get state() { return state; }, get available() { return state === 'ready' && !forcedUnavailable && now() >= 0; }, set unavailable(value) { if (value) { state = 'unavailable'; forcedUnavailable = true; } else recover(); } };
}


export function createQuiesceController({ close = async () => {}, onChange } = {}) {
  let state = 'open';
  let active = 0;
  const publish = (next) => { state = next; onChange?.(state); };
  const leave = () => { active = Math.max(0, active - 1); };
  const enter = () => {
    if (state !== 'open') throw Object.assign(new Error('SQL client is quiesced'), { code: 'QUIESCED' });
    active += 1;
    let left = false;
    return () => { if (!left) { left = true; leave(); } };
  };
  const waitForIdle = async () => { while (active) await new Promise((resolve) => setTimeout(resolve, 10)); };
  return {
    state: () => ({ state, active }),
    enter,
    async begin() { publish('quiescing'); await waitForIdle(); publish('quiesced'); },
    async end() { publish('open'); },
    async close() { await close(); publish('closed'); }
  };
}


export function createQuiesceController({ close = async () => {}, onChange } = {}) {
  let state = "open";
  let active = 0;
  let closing;
  const publish = (next) => {
    state = next;
    onChange?.(state);
  };
  const leave = () => {
    active = Math.max(0, active - 1);
  };
  const enter = () => {
    if (state !== "open")
      throw Object.assign(new Error("SQL client is quiesced"), { code: "QUIESCED" });
    active += 1;
    let left = false;
    return () => {
      if (!left) {
        left = true;
        leave();
      }
    };
  };
  const waitForIdle = async () => {
    while (active) await new Promise((resolve) => setTimeout(resolve, 10));
  };
  const begin = async () => {
    if (state === "closed" || state === "quiesced") return;
    if (state !== "quiescing") publish("quiescing");
    await waitForIdle();
    if (state === "quiescing") publish("quiesced");
  };
  return {
    state: () => ({ state, active }),
    enter,
    begin,
    async end() {
      if (!closing && state !== "closed") publish("open");
    },
    close() {
      if (!closing) {
        closing = (async () => {
          await begin();
          await close();
          publish("closed");
        })().catch((error) => {
          closing = undefined;
          throw error;
        });
      }
      return closing;
    },
  };
}

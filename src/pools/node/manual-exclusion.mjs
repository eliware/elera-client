export function createManualExclusion(setState) {
  let active = false;
  return {
    exclude() {
      active = true;
      setState("unavailable");
    },
    clear() {
      active = false;
    },
    get active() {
      return active;
    },
  };
}

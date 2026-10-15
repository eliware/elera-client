export function createManagedShutdown(detach, close) {
  let ending;
  return async () => {
    ending ??= (async () => {
      await detach?.();
      await close();
    })();
    return ending;
  };
}

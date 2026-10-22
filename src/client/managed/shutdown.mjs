export function createManagedShutdown(detach, close) {
  let ending;
  return () => {
    if (!ending) {
      ending = (async () => {
        let failure;
        try {
          await detach?.();
        } catch (error) {
          failure = error;
        }
        try {
          await close();
        } catch (error) {
          failure ??= error;
        }
        if (failure) throw failure;
      })().catch((error) => {
        ending = undefined;
        throw error;
      });
    }
    return ending;
  };
}

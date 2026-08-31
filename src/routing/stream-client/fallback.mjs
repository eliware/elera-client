import { createRoutingResync } from '../internal-events.mjs';

export function createRestFallback({ fetchBundle, getEndpoint, isClosed, getVersion, setMode, update, onError, log, now }) {
  return async function fallback() {
    try {
      const bundle = await fetchBundle(getEndpoint());
      if (isClosed()) return;
      setMode('rest');
      await update?.(createRoutingResync({ version: getVersion(), bundle, receivedAt: now() }));
    } catch (error) {
      if (isClosed()) return;
      setMode('disconnected');
      onError?.(error);
      log.warn?.('Routing REST fallback failed', { error });
    }
  };
}

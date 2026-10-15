export function createConnectionFailure({ state, fallback, schedule }) {
  return async (error, onError) => {
    state.connecting = false;
    state.socket = undefined;
    state.mode = "disconnected";
    onError?.(error);
    await fallback();
    schedule();
  };
}

export async function handleMissingWebSocketSupport({ fallback, schedule }) {
  await fallback();
  schedule();
}

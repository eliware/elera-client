export function createNodeCloseState({ markClosed, onForceClose }) {
  let closed = false;
  return {
    close: async () => {
      if (closed) return;
      closed = true;
      markClosed();
      await onForceClose();
    },
    get closed() {
      return closed;
    },
  };
}

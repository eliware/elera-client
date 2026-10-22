export function createNodeCloseState({ markClosed, onForceClose }) {
  let closed = false;
  let closing;
  return {
    close: () => {
      if (closed) return Promise.resolve();
      if (!closing) {
        markClosed();
        closing = Promise.resolve()
          .then(onForceClose)
          .then(() => {
            closed = true;
          })
          .catch((error) => {
            closing = undefined;
            throw error;
          });
      }
      return closing;
    },
    get closed() {
      return closed;
    },
  };
}

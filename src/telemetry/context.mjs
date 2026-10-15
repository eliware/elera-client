export function createTelemetryContext({ application, credentialName, database, scopes }) {
  const context = { application, credentialName, database, scopes };
  return {
    set(value = {}) {
      Object.assign(context, value);
    },
    snapshot() {
      return { ...context };
    },
  };
}

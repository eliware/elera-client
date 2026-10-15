export function createNodeSetup(profile) {
  return {
    state: { failures: 0, unavailableUntil: 0 },
    sessionStatements: profile.options?.sessionStatements ?? [],
  };
}

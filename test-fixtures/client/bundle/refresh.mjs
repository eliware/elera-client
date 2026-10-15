export const refreshForState = (
  createBundleRefresh,
  { active, primary, balanced, equivalent, usable, older, makeRoute, validateProfile },
) => {
  const state = { active, primary, balanced };
  const refresh = createBundleRefresh({
    validateBundle: (value) => value,
    getBundle: () => state.active,
    setBundle: (value) => (state.active = value),
    getPrimaryConfig: () => ({}),
    setPrimaryConfig: () => {},
    getPrimaryPool: () => state.primary,
    setPrimaryPool: (value) => (state.primary = value),
    getBalancedPool: () => state.balanced,
    setBalancedPool: (value) => (state.balanced = value),
    makeRoute: makeRoute ?? (() => ({ nodes: [] })),
    validateProfile: validateProfile ?? ((value) => value),
    bundleNeedsRefresh: () => false,
    isOlderBundle: older ?? (() => false),
    equivalentPools: equivalent ?? (() => false),
    usablePool: usable ?? (() => true),
    drainTimeoutMs: 10,
    now: () => 0,
  });
  return { refresh, state };
};

export const emptyPool = () => ({
  nodes: [],
  waitForIdle: async () => {},
  close: async () => {},
});

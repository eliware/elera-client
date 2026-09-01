export function createBundleRefresh({ validateBundle, getBundle, setBundle, getPrimaryConfig, setPrimaryConfig, getBalancedPool, setBalancedPool, getPrimaryPool, setPrimaryPool, makeRoute, validateProfile, bundleNeedsRefresh, isOlderBundle, equivalentPools, usablePool, drainTimeoutMs, now }) {
  return async function refresh(nextBundle) {
    const candidate = validateBundle(nextBundle);
    const active = getBundle();
    const primary = getPrimaryPool();
    const balanced = getBalancedPool();
    if (equivalentPools(candidate, active) && usablePool(primary) && (!balanced || usablePool(balanced))) return { bundleVersion: active.bundleVersion, refreshRequired: bundleNeedsRefresh(active, now()) };
    if (isOlderBundle(candidate.bundleVersion, active?.bundleVersion)) return { bundleVersion: active?.bundleVersion, refreshRequired: bundleNeedsRefresh(active, now()) };
    const previous = [primary, balanced];
    const credentials = candidate.credentials;
    const writer = candidate.writer;
    const reader = candidate.readers?.[0] ?? candidate.routes?.balanced?.[0];
    setBundle(candidate);
    const primaryConfig = validateProfile({ ...getPrimaryConfig(), host: writer.host, port: writer.port, user: credentials.username, password: credentials.password, database: candidate.physicalDatabase }, 'primary');
    setPrimaryConfig(primaryConfig);
    const nextPrimary = makeRoute('primary', primaryConfig);
    setPrimaryPool(nextPrimary);
    let nextBalanced = balanced;
    if (reader) {
      const balancedConfig = validateProfile({ ...primaryConfig, host: reader.host, port: reader.port }, 'balanced');
      nextBalanced = makeRoute('balanced', balancedConfig);
      setBalancedPool(nextBalanced);
    } else if (balanced) {
      for (const node of balanced.nodes) node.drain(drainTimeoutMs);
      nextBalanced = null;
      setBalancedPool(null);
    }
    previous.filter(Boolean).filter((pool) => pool !== nextPrimary && pool !== nextBalanced).forEach((pool) => {
      pool.nodes.forEach((node) => node.drain(drainTimeoutMs));
      void (async () => { await pool.waitForIdle(drainTimeoutMs); await pool.close(); })();
    });
    return { bundleVersion: candidate.bundleVersion, refreshRequired: bundleNeedsRefresh(candidate, now()) };
  };
}

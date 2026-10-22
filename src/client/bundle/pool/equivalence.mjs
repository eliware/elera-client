export const bundlesHaveEquivalentPools = (candidate, current) =>
  current &&
  candidate.bundleVersion === current.bundleVersion &&
  JSON.stringify({
    physicalDatabase: candidate.physicalDatabase,
    credentials: candidate.credentials,
    writer: candidate.writer,
    routes: candidate.routes,
    expiresAt: candidate.expiresAt,
  }) ===
    JSON.stringify({
      physicalDatabase: current.physicalDatabase,
      credentials: current.credentials,
      writer: current.writer,
      routes: current.routes,
      expiresAt: current.expiresAt,
    });

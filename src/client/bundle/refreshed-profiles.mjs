export function createRefreshedProfiles({ candidate, primaryConfig, validateProfile }) {
  const credentials = candidate.credentials;
  const writer = candidate.writer;
  const reader = candidate.readers?.[0] ?? candidate.routes?.balanced?.[0];
  const primary = validateProfile(
    {
      ...primaryConfig,
      host: writer.host,
      port: writer.port,
      user: credentials.username,
      password: credentials.password,
      database: candidate.physicalDatabase,
    },
    "primary",
  );
  const balanced = reader
    ? validateProfile({ ...primary, host: reader.host, port: reader.port }, "balanced")
    : undefined;
  return { primary, balanced };
}

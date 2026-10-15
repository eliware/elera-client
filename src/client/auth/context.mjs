export function credentialContext(primary, options) {
  return {
    database: primary.database,
    identity: options.identity ?? null,
    route: options.route ?? "primary",
  };
}

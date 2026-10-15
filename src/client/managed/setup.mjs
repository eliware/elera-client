export async function createManagedSetup(fetchBundle) {
  const bundle = await fetchBundle();
  const tokenContext = {
    application: bundle.application,
    database: bundle.database,
    credentialName: bundle.credentialName,
    identity: bundle.identity,
    scopes: bundle.scopes,
  };
  return { bundle, tokenContext };
}

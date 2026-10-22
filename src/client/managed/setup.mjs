import { createDbFromBundle } from "../bundle/factory.mjs";

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

export async function createManagedClient({
  bundle,
  tokenContext,
  stream,
  options,
  createClient = createDbFromBundle,
}) {
  const client = await createClient({ ...options, bundle, tokenContext });
  try {
    const detach = await client.attachRoutingStream(stream);
    return { client, detach };
  } catch (error) {
    await Promise.resolve()
      .then(() => stream?.close?.())
      .catch(() => {});
    await client.close().catch(() => {});
    throw error;
  }
}

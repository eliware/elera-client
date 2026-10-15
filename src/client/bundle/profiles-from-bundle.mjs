import { validateBundle } from "@eliware/elera-lib";

export function profilesFromBundle(bundle) {
  const valid = validateBundle(bundle);
  const credentials = valid.credentials;
  const writer = valid.writer;
  const base = {
    host: writer.host,
    port: writer.port,
    user: credentials.username,
    password: credentials.password,
    database: valid.physicalDatabase,
  };
  const balancedNode = valid.readers[0] ?? valid.routes.balanced[0];
  return {
    primary: base,
    balanced: balancedNode
      ? { ...base, host: balancedNode.host, port: balancedNode.port }
      : undefined,
  };
}

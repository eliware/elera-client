import { validateProfile } from "../../config/index.mjs";
import { credentialContext } from "./context.mjs";
import { revalidateCredentialOverlay } from "./credential-overlay.mjs";
import { resolveCredentials } from "./resolve.mjs";

export async function prepareDbProfiles({ primary, balanced, credentialProvider, identity } = {}) {
  if (!primary || typeof primary !== "object")
    throw new TypeError("primary connection profile is required");
  const credentials = await resolveCredentials(
    credentialProvider,
    credentialContext(primary, { identity }),
  );
  let primaryConfig = validateProfile({ ...primary, ...credentials }, "primary");
  if (!primaryConfig.user || typeof primaryConfig.password !== "string")
    throw new TypeError("primary.user and primary.password are required");
  let balancedConfig = balanced
    ? validateProfile({ ...primaryConfig, ...balanced, ...credentials }, "balanced")
    : undefined;
  if (credentialProvider !== undefined) {
    ({ primaryConfig, balancedConfig } = revalidateCredentialOverlay({
      primaryConfig,
      balancedConfig,
      credentials,
    }));
  }
  return { credentials, primaryConfig, balancedConfig };
}

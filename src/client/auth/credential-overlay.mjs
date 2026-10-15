import { validateProfile } from "../../config/index.mjs";

export function revalidateCredentialOverlay({ primaryConfig, balancedConfig, credentials }) {
  return {
    primaryConfig: validateProfile({ ...primaryConfig, ...credentials }, "primary"),
    balancedConfig: balancedConfig
      ? validateProfile({ ...balancedConfig, ...credentials }, "balanced")
      : undefined,
  };
}

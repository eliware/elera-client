import { normalizeProfileSettings } from "./profile-settings.mjs";

export function validateProfile(profile, name = "connection") {
  if (!profile || typeof profile !== "object") throw new TypeError(`${name} profile is required`);
  if (!profile.host || typeof profile.host !== "string")
    throw new TypeError(`${name}.host is required`);
  if (profile.user !== undefined && typeof profile.user !== "string")
    throw new TypeError(`${name}.user must be a string`);
  if (profile.password !== undefined && typeof profile.password !== "string")
    throw new TypeError(`${name}.password must be a string`);
  if (!profile.database || typeof profile.database !== "string")
    throw new TypeError(`${name}.database is required`);
  return { ...profile, ...normalizeProfileSettings(profile, name) };
}

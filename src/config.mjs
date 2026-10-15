import { validateProfile as validate } from "./config/validation.mjs";
import { redactedProfile as redact } from "./config/redaction.mjs";

export function validateProfile(profile, name) {
  return validate(profile, name);
}

export function redactedProfile(profile) {
  return redact(profile);
}

import { validateProfile as validate } from "./validation.mjs";
import { redactedProfile as redact } from "./redaction.mjs";

export function validateProfile(profile, name) {
  return validate(profile, name);
}

export function redactedProfile(profile) {
  return redact(profile);
}

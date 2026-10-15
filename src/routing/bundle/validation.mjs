import {
  validateBundle as validateCanonicalBundle,
  validateRoutingEvent as validateCanonicalRoutingEvent,
} from "@eliware/elera-lib";

export function validateBundle(bundle) {
  return validateCanonicalBundle(bundle);
}

export function validateRoutingEvent(event) {
  return validateCanonicalRoutingEvent(event);
}

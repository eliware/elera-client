import { validateBundle as validateBundleShape } from "@eliware/elera-lib";
import { validateTokenContext } from "./authorization.mjs";

export function createSetupBundleValidator(tokenContext) {
  return (candidate) => validateTokenContext(validateBundleShape(candidate), tokenContext);
}

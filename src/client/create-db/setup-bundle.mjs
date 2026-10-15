import { validateBundle as validateBundleShape } from "@eliware/elera-lib";
import { validateTokenContext } from "../bundle/authorization.mjs";

export function createSetupBundleValidator(tokenContext) {
  return (candidate) => validateTokenContext(validateBundleShape(candidate), tokenContext);
}

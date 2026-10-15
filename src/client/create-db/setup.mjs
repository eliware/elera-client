import { log as defaultLog } from "@eliware/common";
import * as mysql from "mysql2/promise";
import { validateProfile } from "../../config.mjs";
import { createClientTelemetry } from "./telemetry.mjs";
import { prepareDbProfiles } from "./setup-profiles.mjs";
import { createSetupBundleValidator } from "./setup-bundle.mjs";
import { createDbPoolState } from "./setup-pools.mjs";
import { createPoolSelection } from "./pool-selection.mjs";

export async function createDbSetup({
  primary,
  balanced,
  bundle,
  credentialProvider,
  mysqlLib = mysql,
  log = defaultLog,
  routing = "auto",
  identity,
  tokenContext,
  quarantineMs = 5000,
  now = () => Date.now(),
  telemetry,
} = {}) {
  let { primaryConfig, balancedConfig } = await prepareDbProfiles({
    primary,
    balanced,
    credentialProvider,
    identity,
  });
  const validateBundle = createSetupBundleValidator(tokenContext);
  const activeBundle = bundle ? validateBundle(bundle) : undefined;
  const metrics = createClientTelemetry({ telemetry, bundle: activeBundle, now });
  const poolState = createDbPoolState({
    primaryConfig,
    balancedConfig,
    bundle: activeBundle,
    now,
    mysqlLib,
    log,
    quarantineMs,
    metrics,
  });
  return {
    ...poolState,
    selection: createPoolSelection({
      getPrimaryPool: poolState.getPrimaryPool,
      getBalancedPool: poolState.getBalancedPool,
      routing,
    }),
    validateBundle,
    validateProfile,
    metrics,
    now,
    routing,
  };
}

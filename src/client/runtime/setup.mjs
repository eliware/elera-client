import { log as defaultLog } from "@eliware/log";
import * as mysql from "mysql2/promise";
import { validateProfile } from "../../config/index.mjs";
import { createClientTelemetry } from "../telemetry/context.mjs";
import { prepareDbProfiles } from "../auth/profiles.mjs";
import { createSetupBundleValidator } from "../bundle/validate.mjs";
import { createDbPoolState } from "./setup/pools.mjs";
import { createPoolSelection } from "../routing/pool-selection.mjs";

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

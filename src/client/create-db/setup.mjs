import { log as defaultLog } from "@eliware/common";
import * as mysql from "mysql2/promise";
import { validateBundle as validateBundleShape } from "@eliware/elera-lib";
import { validateProfile } from "../../config.mjs";
import { createRouteFactory } from "../route-factory.mjs";
import { validateTokenContext } from "../authorization-context.mjs";
import { createRouteSelection } from "./route-selection.mjs";
import { createClientTelemetry } from "./telemetry.mjs";
import { prepareDbProfiles } from "./setup-profiles.mjs";

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
  const validateBundle = (candidate) =>
    validateTokenContext(validateBundleShape(candidate), tokenContext);
  let activeBundle = bundle ? validateBundle(bundle) : undefined;
  const makeRoute = (route, fallback) =>
    createRouteFactory({ bundle: activeBundle, now, mysqlLib, log, quarantineMs })(route, fallback);
  let primaryPool = makeRoute("primary", primaryConfig);
  let balancedPool =
    balancedConfig || activeBundle?.routes?.balanced?.length
      ? makeRoute("balanced", balancedConfig ?? primaryConfig)
      : null;
  const selection = () => createRouteSelection({ primaryPool, balancedPool, routing });
  const metrics = createClientTelemetry({ telemetry, bundle: activeBundle, now });
  return {
    getPools: () => [primaryPool, balancedPool].filter(Boolean),
    getPrimaryPool: () => primaryPool,
    getBalancedPool: () => balancedPool,
    setPrimaryPool: (value) => {
      primaryPool = value;
    },
    setBalancedPool: (value) => {
      balancedPool = value;
    },
    getPrimaryConfig: () => primaryConfig,
    setPrimaryConfig: (value) => {
      primaryConfig = value;
    },
    getBundle: () => activeBundle,
    setBundle: (value) => {
      activeBundle = value;
      metrics?.setContext?.({
        application: value.application,
        credentialName: value.credentialName,
        database: value.database,
        scopes: value.scopes,
      });
    },
    makeRoute,
    validateBundle,
    validateProfile,
    selection,
    metrics,
    now,
    routing,
  };
}

import { normalizeDriverOptions } from "./driver-options.mjs";

export function createDriverPool(profile, mysqlLib) {
  const driverOptions = normalizeDriverOptions(profile.options);
  return mysqlLib.createPool({
    host: profile.host,
    port: profile.port,
    user: profile.user,
    password: profile.password,
    database: profile.database,
    waitForConnections: true,
    ...driverOptions,
  });
}

export function createDriverPoolCloser(pool) {
  return () => pool.end();
}

export function createDriverPool(profile, mysqlLib) {
  const { acquireTimeout: _acquireTimeout, ...driverOptions } = profile.options ?? {};
  if (driverOptions.socketPath === undefined) delete driverOptions.socketPath;
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

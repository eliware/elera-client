export function normalizeDriverOptions(options = {}) {
  const { acquireTimeout: _acquireTimeout, ...driverOptions } = options;
  if (driverOptions.socketPath === undefined) delete driverOptions.socketPath;
  return driverOptions;
}

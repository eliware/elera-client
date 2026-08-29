
const integer = (value, name, { min, max }) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new TypeError(`${name} must be an integer between ${min} and ${max}`);
  return number;
};

export function validateProfile(profile, name = 'connection') {
  if (!profile || typeof profile !== 'object') throw new TypeError(`${name} profile is required`);
  if (!profile.host || typeof profile.host !== 'string') throw new TypeError(`${name}.host is required`);
  if (profile.user !== undefined && typeof profile.user !== 'string') throw new TypeError(`${name}.user must be a string`);
  if (profile.password !== undefined && typeof profile.password !== 'string') throw new TypeError(`${name}.password must be a string`);
  if (!profile.database || typeof profile.database !== 'string') throw new TypeError(`${name}.database is required`);
  const port = integer(profile.port ?? 3306, `${name}.port`, { min: 1, max: 65535 });
  const options = profile.options ?? {};
  const connectionLimit = integer(options.connectionLimit ?? 10, `${name}.options.connectionLimit`, { min: 1, max: 1000 });
  const queueLimit = integer(options.queueLimit ?? 0, `${name}.options.queueLimit`, { min: 0, max: 1000000 });
  const connectTimeout = integer(options.connectTimeout ?? 10000, `${name}.options.connectTimeout`, { max: 3600000 });
  const acquireTimeout = integer(options.acquireTimeout ?? 10000, `${name}.options.acquireTimeout`, { max: 3600000 });
  if (options.ssl !== undefined && typeof options.ssl !== 'object' && typeof options.ssl !== 'string') throw new TypeError(`${name}.options.ssl must be an object or string`);
  return { ...profile, port, options: { ...options, connectionLimit, queueLimit, connectTimeout, acquireTimeout } };
}

export function redactedProfile(profile) {
  const { password: _password, options = {}, ...safe } = profile;
  const safeOptions = { ...options };
  if (safeOptions.ssl && typeof safeOptions.ssl === 'object') {
    safeOptions.ssl = { ...safeOptions.ssl };
    for (const key of ['key', 'privateKey', 'passphrase']) delete safeOptions.ssl[key];
  }
  return { ...safe, options: safeOptions };
}

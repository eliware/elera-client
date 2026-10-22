import { validateSslSetting } from "./ssl-settings.mjs";

const integer = (value, name, { min, max }) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max)
    throw new TypeError(`${name} must be an integer between ${min} and ${max}`);
  return number;
};

export function normalizeProfileSettings(profile, name = "connection") {
  const options = profile.options ?? {};
  const port = integer(profile.port ?? 3306, `${name}.port`, { min: 1, max: 65535 });
  const connectionLimit = integer(
    options.connectionLimit ?? 10,
    `${name}.options.connectionLimit`,
    { min: 1, max: 1000 },
  );
  const queueLimit = integer(options.queueLimit ?? 0, `${name}.options.queueLimit`, {
    min: 0,
    max: 1000000,
  });
  const connectTimeout = integer(
    options.connectTimeout ?? 10000,
    `${name}.options.connectTimeout`,
    { max: 3600000 },
  );
  const acquireTimeout = integer(
    options.acquireTimeout ?? 10000,
    `${name}.options.acquireTimeout`,
    { max: 3600000 },
  );
  validateSslSetting(options.ssl, name);
  return {
    port,
    options: { ...options, connectionLimit, queueLimit, connectTimeout, acquireTimeout },
  };
}

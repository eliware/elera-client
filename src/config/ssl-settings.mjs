export function validateSslSetting(ssl, name = "connection") {
  if (ssl !== undefined && typeof ssl !== "object" && typeof ssl !== "string")
    throw new TypeError(`${name}.options.ssl must be an object or string`);
}

export function redactedProfile(profile) {
  const { password: _password, options = {}, ...safe } = profile;
  const safeOptions = { ...options };
  if (safeOptions.ssl && typeof safeOptions.ssl === 'object') {
    safeOptions.ssl = { ...safeOptions.ssl };
    for (const key of ['key', 'privateKey', 'passphrase']) delete safeOptions.ssl[key];
  }
  return { ...safe, options: safeOptions };
}

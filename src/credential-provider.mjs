
export async function resolveCredentials(provider, context) {
  if (provider === undefined) return {};
  if (typeof provider !== 'function') throw new TypeError('credentialProvider must be a function');
  const result = await provider(context);
  if (!result || typeof result !== 'object') throw new TypeError('credentialProvider must return an object');
  if (typeof result.user !== 'string' || typeof result.password !== 'string') throw new TypeError('credentialProvider must return user and password');
  return result;
}

export function credentialContext(primary, options) {
  return { database: primary.database, identity: options.identity ?? null, route: options.route ?? 'primary' };
}


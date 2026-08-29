
export function validateTokenContext(bundle, tokenContext = {}) {
  if (!bundle || typeof bundle !== 'object') throw new TypeError('routing bundle is required');
  for (const field of ['application', 'database', 'credentialName']) {
    if (tokenContext[field] !== undefined && bundle[field] !== tokenContext[field]) throw new Error(`routing bundle ${field} does not match token context`);
  }
  if (tokenContext.identity !== undefined && bundle.identity !== tokenContext.identity) throw new Error('routing bundle identity does not match token context');
  if (tokenContext.scopes !== undefined && (!Array.isArray(bundle.scopes) || tokenContext.scopes.some((scope) => !bundle.scopes.includes(scope)))) throw new Error('routing bundle scopes exceed token context');
  return bundle;
}


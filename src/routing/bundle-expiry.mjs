export function bundleExpired(bundle, now = Date.now()) { return Date.parse(bundle.expiresAt) <= now; }
export function bundleNeedsRefresh(bundle, now = Date.now()) { return bundle.refreshAfter ? Date.parse(bundle.refreshAfter) <= now : bundleExpired(bundle, now); }

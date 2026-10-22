export const DEFAULT_BUNDLE_PATH = "/api/v1/routing/bundle";

export function buildBundleUrl(endpoint, path = DEFAULT_BUNDLE_PATH) {
  if (!endpoint) throw new TypeError("Elera API endpoint is required");
  return new URL(path, endpoint.endsWith("/") ? endpoint : `${endpoint}/`).toString();
}

import { validateBundle } from "./validation.mjs";
import { buildBundleUrl, DEFAULT_BUNDLE_PATH } from "./url.mjs";

export async function fetchRoutingBundle({ endpoint, token, path, fetchImpl, signal } = {}) {
  if (!token) throw new TypeError("Elera API token is required");
  const request = fetchImpl === undefined ? globalThis.fetch : fetchImpl;
  if (typeof request !== "function") throw new TypeError("fetch implementation is required");
  const response = await request(buildBundleUrl(endpoint, path ?? DEFAULT_BUNDLE_PATH), {
    method: "GET",
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
    signal,
  });
  if (!response?.ok)
    throw new Error(`routing bundle request failed with HTTP ${response?.status ?? 0}`);
  let envelope;
  try {
    envelope = await response.json();
  } catch (error) {
    throw new Error("routing bundle response was not valid JSON", { cause: error });
  }
  if (
    !envelope ||
    envelope.ok !== true ||
    typeof envelope.operation !== "string" ||
    !envelope.data ||
    typeof envelope.data !== "object"
  )
    throw new Error("routing bundle response envelope is invalid");
  return validateBundle(envelope.data);
}

export { DEFAULT_BUNDLE_PATH };

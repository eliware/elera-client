import { expect, jest, test } from "@jest/globals";
import { validateBundle, validateRoutingEvent } from "@eliware/elera-lib";
import { fetchRoutingBundle } from "../../src/routing/bundle-fetcher.mjs";
import { bundle } from "../../test-fixtures/client/create-db.mjs";

test("uses the default bundle path and rejects a missing endpoint", async () => {
  await expect(
    fetchRoutingBundle({
      token: "token",
      fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
    }),
  ).rejects.toThrow("endpoint");
});
test("rejects a completely omitted request", async () => {
  await expect(fetchRoutingBundle()).rejects.toThrow("token");
});

test("fetches and validates an authenticated routing bundle", async () => {
  const envelope = (data) => ({ ok: true, operation: "routing.bundle", data });
  const fetchImpl = jest.fn(async () => ({ ok: true, json: async () => envelope(bundle) }));
  await expect(
    fetchRoutingBundle({ endpoint: "http://vip:8080", token: "token", fetchImpl }),
  ).resolves.toEqual(bundle);
  expect(fetchImpl).toHaveBeenCalledWith(
    "http://vip:8080/api/v1/routing/bundle",
    expect.objectContaining({
      headers: expect.objectContaining({ authorization: "Bearer token" }),
    }),
  );
});

test("rejects missing credentials, failed responses, and malformed JSON", async () => {
  await expect(
    fetchRoutingBundle({
      token: "t",
      fetchImpl: async () => ({ ok: true, json: async () => bundle }),
    }),
  ).rejects.toThrow("endpoint");
  await expect(
    fetchRoutingBundle({ endpoint: "http://vip", token: "t", fetchImpl: null }),
  ).rejects.toThrow("fetch implementation");
  await expect(
    fetchRoutingBundle({ endpoint: "http://vip", fetchImpl: jest.fn() }),
  ).rejects.toThrow("token");
  await expect(
    fetchRoutingBundle({
      endpoint: "http://vip",
      token: "t",
      fetchImpl: async () => ({ ok: false, status: 401 }),
    }),
  ).rejects.toThrow("401");
  await expect(
    fetchRoutingBundle({
      endpoint: "http://vip",
      token: "t",
      fetchImpl: async () => ({
        ok: true,
        json: async () => {
          throw new Error("bad");
        },
      }),
    }),
  ).rejects.toThrow("valid JSON");
});

test("rejects a response that does not satisfy the canonical routing-bundle contract", async () => {
  await expect(
    fetchRoutingBundle({
      endpoint: "http://vip",
      token: "t",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ ok: true, operation: "routing.bundle" }),
      }),
    }),
  ).rejects.toThrow("envelope");
  await expect(
    fetchRoutingBundle({
      endpoint: "http://vip",
      token: "t",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          operation: "routing.bundle",
          data: { ...bundle, routes: { primary: bundle.routes.primary } },
        }),
      }),
    }),
  ).rejects.toThrow("balanced");
  await expect(
    fetchRoutingBundle({
      endpoint: "http://vip",
      token: "t",
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          ok: true,
          operation: "routing.bundle",
          data: { ...bundle, credentials: { username: "u" } },
        }),
      }),
    }),
  ).rejects.toThrow("password");
});

test("normalizes endpoints with a trailing slash and accepts a custom path", async () => {
  const fetchImpl = jest.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, operation: "routing.bundle", data: bundle }),
  }));
  await fetchRoutingBundle({
    endpoint: "http://vip:8080/",
    token: "token",
    path: "/custom",
    fetchImpl,
  });
  expect(fetchImpl.mock.calls[0][0]).toBe("http://vip:8080/custom");
});

test("rejects an absent HTTP response", async () => {
  await expect(
    fetchRoutingBundle({
      endpoint: "http://vip",
      token: "token",
      fetchImpl: async () => undefined,
    }),
  ).rejects.toThrow("HTTP 0");
});

test("uses the default fetch implementation and bundle path", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, operation: "routing.bundle", data: bundle }),
  }));
  try {
    await expect(
      fetchRoutingBundle({ endpoint: "http://vip:8080", token: "token" }),
    ).resolves.toEqual(bundle);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("validates shared bundles and routing events from the published library", () => {
  expect(validateBundle(bundle)).toBeTruthy();
  expect(
    validateRoutingEvent({
      type: "routing.recovery",
      version: 1,
      generatedAt: "2099-01-01T00:00:00Z",
      node: "writer",
      context: {},
    }),
  ).toMatchObject({ type: "routing.recovery" });
});

test("shared bundle validation rejects invalid ports and missing route arrays", () => {
  expect(() => validateBundle({ ...bundle, ports: { sql: "3306", http: 8080 } })).toThrow();
  expect(() => validateBundle({ ...bundle, routes: { primary: bundle.routes.primary } })).toThrow();
});

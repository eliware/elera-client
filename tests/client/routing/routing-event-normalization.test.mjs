import { expect, test } from "@jest/globals";
import { normalizeRoutingUpdate } from "../../../src/client/routing/routing-event-normalization.mjs";
import { ROUTING_RESYNC } from "../../../src/routing/internal-events.mjs";

test("removes stream metadata from routing updates", () => {
  const event = {
    type: "routing.update",
    version: 3,
    generatedAt: "2099-01-01T00:00:00Z",
    bundleVersion: 2,
  };
  expect(normalizeRoutingUpdate(event)).toEqual({ bundleVersion: 2 });
  expect(event.version).toBe(3);
});

test("uses the bundle from a REST resync event", () => {
  const bundle = { bundleVersion: 4, version: 4, generatedAt: "time" };
  expect(normalizeRoutingUpdate({ type: ROUTING_RESYNC, version: 4, bundle })).toEqual({
    bundleVersion: 4,
  });
  expect(bundle).toEqual({ bundleVersion: 4, version: 4, generatedAt: "time" });
});

test("ignores unrelated events", () => {
  expect(normalizeRoutingUpdate({ type: "routing.drain" })).toBeUndefined();
});

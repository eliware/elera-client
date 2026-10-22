import { expect, test } from "@jest/globals";
import { activeEndpointFromShutdown } from "../../../../src/routing/stream/shutdown/endpoint.mjs";

test("uses a load balancer endpoint from a shutdown event", () => {
  expect(activeEndpointFromShutdown("http://old", { loadBalancerEndpoint: "https://new" })).toBe(
    "https://new",
  );
});

test.each([undefined, null, "", 1])("keeps the current endpoint for invalid values %j", (value) => {
  expect(activeEndpointFromShutdown("http://old", { loadBalancerEndpoint: value })).toBe(
    "http://old",
  );
});

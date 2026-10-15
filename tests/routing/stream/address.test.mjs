import { expect, test } from "@jest/globals";
import { activeEndpointFromShutdown, websocketUrl } from "../../../src/routing/stream/address.mjs";

test("maps API endpoints to streams and accepts shutdown endpoints", () => {
  expect(websocketUrl("https://api.example/")).toBe("wss://api.example/api/v1/routing/stream");
  expect(activeEndpointFromShutdown("http://old", { loadBalancerEndpoint: "https://new" })).toBe(
    "https://new",
  );
  expect(activeEndpointFromShutdown("http://old", {})).toBe("http://old");
});

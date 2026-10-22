import { expect, test } from "@jest/globals";
import { activeStreamUrl, websocketUrl } from "../../../src/routing/stream/address.mjs";

test("maps API endpoints to stream URLs", () => {
  expect(websocketUrl("https://api.example/")).toBe("wss://api.example/api/v1/routing/stream");
  expect(activeStreamUrl({ activeEndpoint: "https://api.example" })).toBe(
    "wss://api.example/api/v1/routing/stream",
  );
});

import { expect, test, jest } from "@jest/globals";
import { createRoutingRuntime } from "../../../src/routing/stream-client/runtime.mjs";

test("builds a disconnected runtime with its public stream API", () => {
  const runtime = createRoutingRuntime({
    endpoint: "http://vip",
    fetchBundle: jest.fn(async () => ({})),
  });
  expect(runtime.state()).toMatchObject({ connected: false, mode: "disconnected" });
  expect(runtime.setOnUpdate).toEqual(expect.any(Function));
  runtime.close();
});

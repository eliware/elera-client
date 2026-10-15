import { expect, test } from "@jest/globals";
import { createNodeSetup } from "../../../src/pools/node/setup.mjs";

test("creates node state and reads configured session statements", () => {
  const sessionStatements = ["SET x=1"];
  const setup = createNodeSetup({ options: { sessionStatements } });

  expect(setup.state).toEqual({ failures: 0, unavailableUntil: 0 });
  expect(setup.sessionStatements).toBe(sessionStatements);
});

test("uses empty session statements when profile options are absent", () => {
  expect(createNodeSetup({}).sessionStatements).toEqual([]);
});

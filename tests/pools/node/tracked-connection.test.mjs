import { expect, jest, test } from "@jest/globals";
import { trackNodeConnection } from "../../../src/pools/node/tracked-connection.mjs";

test("counts active work until connection release and counts release once", () => {
  const release = jest.fn();
  const lifecycle = { begin: jest.fn(), end: jest.fn() };
  const connection = trackNodeConnection({ release }, lifecycle);

  connection.release();
  connection.release();

  expect(lifecycle.begin).toHaveBeenCalledTimes(1);
  expect(lifecycle.end).toHaveBeenCalledTimes(1);
  expect(release).toHaveBeenCalledTimes(1);
});

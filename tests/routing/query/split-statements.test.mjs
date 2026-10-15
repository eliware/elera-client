import { expect, test } from "@jest/globals";
import { splitStatements } from "../../../src/routing/query/split-statements.mjs";

test("removes leading comments before it splits statements", () => {
  expect(splitStatements("/* note */ SELECT 1")).toEqual(["SELECT 1"]);
  expect(splitStatements("-- note\nSELECT 1")).toEqual(["SELECT 1"]);
});

test("returns empty input and single or multiple statements", () => {
  expect(splitStatements("")).toEqual([""]);
  expect(splitStatements("SELECT 1")).toEqual(["SELECT 1"]);
  expect(splitStatements("SELECT 1; SELECT 2")).toEqual(["SELECT 1", "SELECT 2"]);
  expect(splitStatements("SELECT 1;")).toEqual(["SELECT 1", ""]);
  expect(splitStatements(null)).toEqual([]);
});

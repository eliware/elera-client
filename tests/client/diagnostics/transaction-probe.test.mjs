import { expect, jest, test } from "@jest/globals";
import { verifyProbeTransaction } from "../../../src/client/diagnostics/transaction-probe.mjs";

test("starts, rolls back, and releases the probe connection", async () => {
  const connection = {
    beginTransaction: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  await expect(verifyProbeTransaction(async () => connection)).resolves.toBeUndefined();
  expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test("rolls back and releases when the transaction start fails", async () => {
  const connection = {
    beginTransaction: jest.fn(async () => {
      throw new Error("transaction failed");
    }),
    rollback: jest.fn(),
    release: jest.fn(),
  };
  await expect(verifyProbeTransaction(async () => connection)).rejects.toThrow(
    "transaction failed",
  );
  expect(connection.rollback).toHaveBeenCalledTimes(1);
  expect(connection.release).toHaveBeenCalledTimes(1);
});

test("propagates a connection acquisition failure", async () => {
  await expect(
    verifyProbeTransaction(async () => {
      throw new Error("acquire failed");
    }),
  ).rejects.toThrow("acquire failed");
});

test("keeps the start failure when rollback also fails", async () => {
  const connection = {
    beginTransaction: jest.fn(async () => {
      throw new Error("start failed");
    }),
    rollback: jest.fn(async () => {
      throw new Error("rollback failed");
    }),
    release: jest.fn(),
  };
  await expect(verifyProbeTransaction(async () => connection)).rejects.toThrow("start failed");
  expect(connection.release).toHaveBeenCalledTimes(1);
});

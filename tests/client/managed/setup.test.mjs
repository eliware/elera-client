import { expect, jest, test } from "@jest/globals";
import { createManagedClient, createManagedSetup } from "../../../src/client/managed/setup.mjs";

test("fetches the bundle and creates its token context", async () => {
  const bundle = {
    application: "app",
    database: "db",
    credentialName: "credential",
    identity: "identity",
    scopes: ["read"],
  };
  const fetchBundle = jest.fn(async () => bundle);
  await expect(createManagedSetup(fetchBundle)).resolves.toEqual({
    bundle,
    tokenContext: {
      application: "app",
      database: "db",
      credentialName: "credential",
      identity: "identity",
      scopes: ["read"],
    },
  });
  expect(fetchBundle).toHaveBeenCalledTimes(1);
});

test("passes bundle fetch errors to the caller", async () => {
  const failure = new Error("bundle failed");
  await expect(
    createManagedSetup(async () => {
      throw failure;
    }),
  ).rejects.toBe(failure);
});

test("creates the database client and attaches its stream", async () => {
  const client = { attachRoutingStream: jest.fn(async () => "detach") };
  const createClient = jest.fn(async () => client);
  const stream = {};
  const options = { routing: "primary" };
  await expect(
    createManagedClient({
      bundle: { application: "app" },
      tokenContext: { application: "app" },
      stream,
      options,
      createClient,
    }),
  ).resolves.toEqual({ client, detach: "detach" });
  expect(createClient).toHaveBeenCalledWith({
    routing: "primary",
    bundle: { application: "app" },
    tokenContext: { application: "app" },
  });
  expect(client.attachRoutingStream).toHaveBeenCalledWith(stream);
});

test("closes the database client when stream attachment fails", async () => {
  const failure = new Error("attach failed");
  const stream = { close: jest.fn().mockRejectedValue(new Error("stream close failed")) };
  const client = {
    attachRoutingStream: jest.fn(async () => {
      throw failure;
    }),
    close: jest.fn().mockRejectedValue(new Error("close failed")),
  };
  await expect(
    createManagedClient({
      bundle: {},
      tokenContext: {},
      stream,
      options: {},
      createClient: async () => client,
    }),
  ).rejects.toBe(failure);
  expect(client.close).toHaveBeenCalledTimes(1);
  expect(stream.close).toHaveBeenCalledTimes(1);
});

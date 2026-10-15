import { createDbFromBundle } from "../../../src/client/bundle/factory.mjs";
import { expect, test } from "@jest/globals";
import { bundle } from "../../../test-fixtures/client/runtime.mjs";
test("creates a client from only a validated bundle", async () => {
  const client = await createDbFromBundle({
    bundle,
    createClient: async (options) => ({
      options,
      bundle: () => options.bundle,
      close: async () => {},
    }),
  });
  expect(client.bundle()).toBe(bundle);
  await client.close();
});
test("can construct the default SQL client factory", async () => {
  const client = await createDbFromBundle({
    bundle,
    mysqlLib: {
      createPool: () => ({
        query: async () => [[]],
        execute: async () => [[]],
        getConnection: async () => ({}),
        end: async () => {},
      }),
    },
    log: {},
  });
  await client.close();
});
test("rejects an omitted bundle before selecting a client factory", async () => {
  await expect(createDbFromBundle()).rejects.toThrow();
});

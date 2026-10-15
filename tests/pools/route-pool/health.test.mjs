import { expect, test } from "@jest/globals";
import { createPoolHealth } from "../../../src/pools/route-pool/health.mjs";

test("returns each node health result and records failures", async () => {
  const health = createPoolHealth([
    { health: async () => ({ ok: true, host: "db" }) },
    {
      host: "down",
      port: 3306,
      health: async () => {
        throw new Error("offline");
      },
    },
  ]);
  await expect(health()).resolves.toEqual([
    { ok: true, host: "db" },
    { ok: false, host: "down", port: 3306, error: "offline" },
  ]);
});

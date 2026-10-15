import { expect, jest, test } from "@jest/globals";
import { createRefreshedProfiles } from "../../../src/client/bundle/refreshed-profiles.mjs";

test("builds primary and balanced profiles from bundle credentials and routes", () => {
  const validateProfile = jest.fn((value) => value);
  const profiles = createRefreshedProfiles({
    candidate: {
      credentials: { username: "user", password: "pass" },
      writer: { host: "writer", port: 3306 },
      readers: [{ host: "reader", port: 3307 }],
      physicalDatabase: "physical",
    },
    primaryConfig: { host: "old", database: "old" },
    validateProfile,
  });
  expect(profiles.primary).toMatchObject({
    host: "writer",
    port: 3306,
    user: "user",
    password: "pass",
    database: "physical",
  });
  expect(profiles.balanced).toMatchObject({ host: "reader", port: 3307 });
  expect(validateProfile).toHaveBeenNthCalledWith(1, expect.any(Object), "primary");
  expect(validateProfile).toHaveBeenNthCalledWith(2, expect.any(Object), "balanced");
});

test("uses the balanced route when the reader list is empty", () => {
  const profiles = createRefreshedProfiles({
    candidate: {
      credentials: { username: "user", password: "pass" },
      writer: { host: "writer", port: 3306 },
      readers: [],
      routes: { balanced: [{ host: "route-reader", port: 3308 }] },
      physicalDatabase: "physical",
    },
    primaryConfig: {},
    validateProfile: (value) => value,
  });
  expect(profiles.balanced).toMatchObject({ host: "route-reader", port: 3308 });
});

import { jest } from "@jest/globals";

export const connection = () => ({
  query: jest.fn(async () => [["ok"]]),
  execute: jest.fn(async () => [["ok"]]),
  release: jest.fn(),
});

export const driver = (overrides = {}) => ({
  createPool: () => ({
    query: jest.fn(async () => [["ok"]]),
    execute: jest.fn(async () => [["ok"]]),
    getConnection: jest.fn(async () => connection()),
    end: jest.fn(async () => {}),
    ...overrides,
  }),
});

export const profile = { host: "db", port: 3306, user: "u", password: "p", database: "app" };

import { jest } from "@jest/globals";
import { createDb } from "../../src/client/managed/index.mjs";

export const bundle = {
  apiVersion: "v1",
  application: "app",
  database: "app",
  physicalDatabase: "physical_app",
  identity: "runtime",
  credentialName: "rw",
  scopes: ["read", "write"],
  credentials: { username: "u", password: "p" },
  routes: {
    primary: [{ host: "writer", port: 3306 }],
    balanced: [{ host: "reader", port: 3306 }],
  },
  writer: { host: "writer", port: 3306 },
  readers: [{ host: "reader", port: 3306 }],
  failover: [],
  bundleVersion: 1,
  nodeIdentity: "writer",
  ports: { sql: 3306, http: 8080 },
  expiresAt: "2099-01-01T00:00:00Z",
};

export const driver = {
  createPool: () => ({
    query: async () => [[]],
    execute: async () => [[]],
    getConnection: async () => ({ release() {} }),
    end: async () => {},
  }),
};

export const sockets = [];

export class FakeWebSocket {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.readyState = 0;
  }
  close() {
    this.readyState = 3;
  }
}

export class LifecycleSocket extends FakeWebSocket {
  constructor(url, options) {
    super(url, options);
    sockets.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }
  message(event) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }
  close() {
    super.close();
    this.onclose?.();
  }
}

export async function makeManagedClient({
  query = jest.fn(),
  execute = jest.fn(),
  connection = {},
} = {}) {
  const end = jest.fn(async () => {});
  const mysqlLib = {
    createPool: () => ({ query, execute, getConnection: async () => connection, end }),
  };
  const fetchImpl = jest.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, operation: "routing.bundle", data: bundle }),
  }));
  const client = await createDb({
    endpoint: "http://vip:8080",
    token: "token",
    fetchImpl,
    WebSocketImpl: FakeWebSocket,
    mysqlLib,
  });
  return { client, end, fetchImpl };
}

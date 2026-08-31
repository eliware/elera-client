import { expect, jest, test } from '@jest/globals';
import { createRoutingStream } from '../../../src/routing/stream-client/index.mjs';
import { FakeWebSocket, sockets } from './fixtures.mjs';

afterEach(() => sockets.splice(0).forEach((socket) => socket.close()));

test('accepts a telemetry sink after construction', () => { const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: FakeWebSocket }); client.setTelemetry({ recordReconnect: jest.fn() }); client.close(); });
test('sends telemetry only over an open socket', async () => { const sent = []; class TelemetrySocket extends FakeWebSocket { send(value) { sent.push(value); } } const client = createRoutingStream({ endpoint: 'http://vip', fetchBundle: async () => ({}), WebSocketImpl: TelemetrySocket }); await client.connect(); const socket = sockets.at(-1); client.sendTelemetry({ type: 'client.telemetry' }); expect(sent).toHaveLength(0); socket.open(); client.sendTelemetry({ type: 'client.telemetry' }); expect(sent).toHaveLength(1); client.close(); });

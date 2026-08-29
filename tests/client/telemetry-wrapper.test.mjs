import { expect, jest, test } from '@jest/globals';
import { createTimedOperation } from '../../src/client/telemetry-wrapper.mjs';

test('runs without telemetry', async () => { await expect(createTimedOperation()(() => 'ok')).resolves.toBe('ok'); });
test('records successful and failed elapsed operations', async () => { let clock = 10; const metrics = { begin: jest.fn(() => clock), record: jest.fn() }; const timed = createTimedOperation({ metrics, now: () => clock }); await expect(timed(async () => { clock = 14; return 'ok'; })).resolves.toBe('ok'); clock = 20; await expect(timed(async () => { clock = 23; throw new Error('failed'); })).rejects.toThrow('failed'); expect(metrics.record).toHaveBeenNthCalledWith(1, { latencyMs: 4 }); expect(metrics.record).toHaveBeenNthCalledWith(2, { latencyMs: 3, failed: true }); });
test('uses the default telemetry sink', async () => { await expect(createTimedOperation()(async () => 'ok')).resolves.toBe('ok'); });
test('uses the default clock with an injected start time', async () => { const metrics = { begin: () => 0, record: jest.fn() }; await createTimedOperation({ metrics })(async () => 'ok'); expect(metrics.record).toHaveBeenCalledTimes(1); });
test('uses zero latency when telemetry has no start time', async () => { const metrics = { begin: () => undefined, record: jest.fn() }; await createTimedOperation({ metrics })(async () => 'ok'); expect(metrics.record).toHaveBeenCalledWith({ latencyMs: 0 }); });

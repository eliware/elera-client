import { expect, test } from '@jest/globals';
import { validateRoutingEvent } from '@eliware/elera-lib';

test('validates shutdown handoff fields', () => {
  expect(validateRoutingEvent({ type: 'routing.shutdown', node: 'elera-0', reconnectDeadlineMs: 1000, loadBalancerEndpoint: 'http://vip' })).toMatchObject({ node: 'elera-0' });
  expect(() => validateRoutingEvent({ type: 'routing.shutdown', reconnectDeadlineMs: -1 })).toThrow('deadline');
  expect(() => validateRoutingEvent({ type: 'routing.shutdown', loadBalancerEndpoint: 1 })).toThrow('endpoint');
  expect(() => validateRoutingEvent({ type: 'routing.shutdown', node: 1 })).toThrow('node');
});

test('rejects unsupported routing events', () => {
  expect(() => validateRoutingEvent(undefined)).toThrow('unsupported');
  expect(() => validateRoutingEvent({ type: 'other' })).toThrow('unsupported');
});

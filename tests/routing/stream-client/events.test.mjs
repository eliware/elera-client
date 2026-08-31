import { expect, test } from '@jest/globals';
import { parseRoutingEvent } from '../../../src/routing/stream-client/events.mjs';

test('parses and validates routing event payloads', () => {
  expect(parseRoutingEvent(JSON.stringify({ type: 'routing.topology', version: 1, generatedAt: '2030-01-01T00:00:00Z', node: 'writer', context: { nodeIdentity: { name: 'writer' }, ports: { sql: 3306, http: 8080 }, clusterCondition: 'Primary' }, topology: { nodes: [] } }))).toMatchObject({ type: 'routing.topology', version: 1 });
  expect(() => parseRoutingEvent('{bad')).toThrow();
});

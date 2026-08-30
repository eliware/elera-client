import { expect, test } from '@jest/globals';
import { validateRoutingNode } from '../../src/routing/node-validation.mjs';
test('normalizes valid routing nodes', () => { expect(validateRoutingNode({ host: ' node ', port: '3307', weight: 2 })).toEqual({ host: 'node', port: 3307, weight: 2 }); });
test('rejects invalid routing nodes', () => { expect(() => validateRoutingNode()).toThrow('host'); expect(() => validateRoutingNode({ host: 'node', port: 0 })).toThrow('port'); expect(() => validateRoutingNode({ host: 'node', weight: -1 })).toThrow('weight'); });

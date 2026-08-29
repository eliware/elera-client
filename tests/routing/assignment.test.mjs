import { expect, test } from '@jest/globals';
import { failoverNodes, writerAssignment } from '@eliware/elera-lib';
test('normalizes explicit writer and ordered failover assignments', () => { const bundle = { writer: { host: 'writer', port: '3306' }, failover: [{ host: 'backup' }] }; expect(writerAssignment(bundle)).toEqual({ host: 'writer', port: 3306 }); expect(failoverNodes(bundle)).toEqual([{ host: 'backup', port: 3306 }]); });
test('rejects incomplete assignments', () => { expect(() => writerAssignment({})).toThrow('writer'); expect(() => failoverNodes({})).toThrow('failover'); });
test('defaults an omitted writer port', () => expect(writerAssignment({ writer: { host: 'writer' } })).toEqual({ host: 'writer', port: 3306 }));

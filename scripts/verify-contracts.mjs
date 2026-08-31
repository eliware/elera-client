import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const entrypoint = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
const declarations = await readFile(new URL('../src/index.d.ts', import.meta.url), 'utf8');

const failures = [];
const requireText = (text, pattern, description) => {
  if (!text.includes(pattern)) failures.push(description);
};

if (packageJson.exports?.['.']?.import !== './src/index.mjs') failures.push('package export must point to src/index.mjs');
if (packageJson.exports?.['.']?.types !== './src/index.d.ts') failures.push('package export must point to src/index.d.ts');
requireText(entrypoint, "export { createDb }", 'public entrypoint must export createDb');
requireText(declarations, 'export function createDb(', 'declarations must declare createDb');
requireText(declarations, 'getConnection()', 'declarations must expose getConnection');
requireText(declarations, 'end(): Promise<void>', 'declarations must expose end');
for (const legacyName of ['bundle', 'refresh', 'availability', 'nodeStates', 'drain', 'telemetry', 'close', 'transaction']) {
  if (new RegExp(`(?:export |interface |\u007b|,)${legacyName}`).test(entrypoint) || new RegExp(`(?:interface |\u007b|,)${legacyName}[(:?]`).test(declarations)) failures.push(`legacy Elera API must not be public: ${legacyName}`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Client public contract is valid.');
}

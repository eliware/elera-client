import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const entrypoint = await readFile(new URL('../src/index.mjs', import.meta.url), 'utf8');
const declarations = await readFile(new URL('../src/index.d.ts', import.meta.url), 'utf8');
const errors = await readFile(new URL('../src/errors.mjs', import.meta.url), 'utf8');

const failures = [];
const requireText = (text, pattern, description) => {
  if (!text.includes(pattern)) failures.push(description);
};

if (packageJson.exports?.['.']?.import !== './src/index.mjs') failures.push('package export must point to src/index.mjs');
if (packageJson.exports?.['.']?.types !== './src/index.d.ts') failures.push('package export must point to src/index.d.ts');
requireText(entrypoint, "export { createDb }", 'public entrypoint must export createDb');
requireText(declarations, 'export function createDb(', 'declarations must declare createDb');
requireText(entrypoint, "from './errors.mjs'", 'client errors must come from the client error module');
requireText(errors, 'export class SqlClientError', 'client error module must define SqlClientError');

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Client public contract is valid.');
}

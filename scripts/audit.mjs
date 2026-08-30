import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
delete process.env.npm_config_allow_scripts;
delete process.env.NPM_CONFIG_ALLOW_SCRIPTS;
const result = spawnSync(npm, ['audit', '--omit=dev', '--audit-level=moderate'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);

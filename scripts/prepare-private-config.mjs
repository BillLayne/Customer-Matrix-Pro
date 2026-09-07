import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const staff = path.resolve(root, '..', 'Agency-Staff-Dashboard');
const privateFolder = path.resolve(root, '..', 'Agency-Staff-Contact-Backups');
mkdirSync(privateFolder, { recursive: true });
const output = path.join(privateFolder, 'command-center-access-2026-09-07.txt');
if (existsSync(output)) throw new Error('Private credentials were already prepared; refusing to rotate them again.');
const parse = value => Object.fromEntries(value.split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => { const index = line.indexOf('='); return [line.slice(0, index), line.slice(index + 1).trim().replace(/^(['"])(.*)\1$/, '$2')]; }));
const configs = [];
for (const [folder, name] of [[root, 'Agent Command Center'], [staff, 'Staff Dashboard']]) {
  const file = path.join(folder, '.dev.vars');
  const config = existsSync(file) ? parse(readFileSync(file, 'utf8')) : {};
  config.SITE_PASSWORD = randomBytes(18).toString('base64url');
  config.SESSION_SECRET = randomBytes(48).toString('base64url');
  writeFileSync(file, Object.entries(config).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
  configs.push(`${name}\nURL: https://${folder === root ? 'customer-matrix-pro' : 'agency-staff-dashboard'}.pages.dev/\nPassword: ${config.SITE_PASSWORD}\n`);
}
writeFileSync(output, `PRIVATE - Bill Layne Insurance\nPrepared September 7, 2026\nThese passwords replace the old publicly embedded access codes.\nDo not add this file to either repository. Share only the staff password with authorized staff.\n\n${configs.join('\n')}`, { mode: 0o600 });
console.log(`Private credentials prepared in ${output}. No credentials printed.`);

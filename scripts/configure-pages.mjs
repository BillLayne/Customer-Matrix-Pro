import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const parse = value => Object.fromEntries(value.split(/\r?\n/).filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line)).map(line => {
  const index = line.indexOf('=');
  const raw = line.slice(index + 1).trim();
  return [line.slice(0, index), raw.startsWith('"') ? JSON.parse(raw) : raw.replace(/^'(.*)'$/, '$1')];
}));
const stage = process.argv[2];
if (!['preview', 'production'].includes(stage)) throw new Error('Choose preview or production explicitly.');
const credentials = parse(readFileSync(path.join(root, '.dev.vars'), 'utf8'));
for (const [folder, project] of [[root, 'customer-matrix-pro'], [path.resolve(root, '../Agency-Staff-Dashboard'), 'agency-staff-dashboard']]) {
  const config = parse(readFileSync(path.join(folder, '.dev.vars'), 'utf8'));
  if (!config.SITE_PASSWORD || !config.SESSION_SECRET) throw new Error(`${project}: missing private credentials.`);
  const url = `https://api.cloudflare.com/client/v4/accounts/${credentials.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${project}`;
  const headers = { Authorization: `Bearer ${credentials.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' };
  const previous = await fetch(url, { headers }).then(response => response.json());
  if (!previous.success) throw new Error(`${project}: unable to read Pages configuration.`);
  const env = { ...previous.result.deployment_configs[stage].env_vars };
  for (const name of ['SITE_PASSWORD', 'SESSION_SECRET', 'GEMINI_API_KEY']) {
    if (config[name]) env[name] = { type: 'secret_text', value: config[name] };
  }
  const result = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ deployment_configs: { [stage]: { env_vars: env } } }) }).then(response => response.json());
  if (!result.success) throw new Error(`${project}: Pages configuration update failed.`);
  console.log(`${project}: ${stage} private configuration updated; no secrets printed.`);
}

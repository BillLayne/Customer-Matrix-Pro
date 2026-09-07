import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const values = [];
for (const file of ['.dev.vars', '.env.local']) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!/^(SITE_PASSWORD|SESSION_SECRET|GEMINI_API_KEY|GOOGLE_API_KEY|API_KEY|CLOUDFLARE_API_TOKEN)=/.test(line)) continue;
    const value = line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (value.length > 8) values.push(value);
  }
}
const files = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
for (const file of files) {
  if (/(^|\/)(\.dev\.vars|\.env(?:\..*)?)$/.test(file) || file.startsWith('output/')) throw new Error(`Private file staged: ${file}`);
  const source = execFileSync('git', ['show', ':' + file], { encoding: 'utf8' });
  if (values.some(value => source.includes(value))) throw new Error(`Private configuration detected in ${file}. No secret value printed.`);
}
console.log(`Private-configuration scan passed for ${files.length} staged files.`);

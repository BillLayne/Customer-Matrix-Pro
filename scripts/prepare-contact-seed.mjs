import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { validateContacts } from '../server/contacts.ts';

const input = process.argv[2];
if (!input) throw new Error('Provide an existing private contact backup path.');
const backup = JSON.parse(readFileSync(input, 'utf8'));
const entries = Array.isArray(backup) ? backup : backup.entries;
if (!validateContacts(entries)) throw new Error('Private backup did not pass server validation.');
const output = path.join(path.dirname(path.resolve(input)), 'shared-contact-initial-seed.sql');
const json = JSON.stringify(entries).replace(/'/g, "''");
writeFileSync(output, `UPDATE contact_directory SET entries = '${json}', revision = 1, updated_at = ${Date.now()} WHERE id = 1 AND revision = 0 AND entries = '[]';\n`, { mode: 0o600 });
console.log(`Validated ${entries.length} entries; prepared insert-only-if-empty seed outside the public repository.`);

import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { resolve, sep, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve(import.meta.dirname, '..');
const directory = process.env.PRIME_UPSTREAM_DIR && resolve(process.env.PRIME_UPSTREAM_DIR);
if (!directory || directory === root || directory.startsWith(root + sep)) throw Error('Set PRIME_UPSTREAM_DIR outside the repository');
mkdirSync(directory, { recursive: true });
const entries = JSON.parse(readFileSync(join(root, 'native/gmp/upstreams.json')));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const entry of entries) {
  if (!/^[A-Za-z0-9._+-]+$/.test(entry.file) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Invalid source manifest');
  const path = join(directory, entry.file);
  if (!existsSync(path)) {
    const temporary = mkdtempSync(join(directory, '.prime-fetch-'));
    try {
      const downloaded = join(temporary, 'source');
      // Same pinned HTTPS URL only; retry interrupted transport, never a bad hash or alternate source.
      const call = spawnSync('curl', ['--fail', '--silent', '--show-error', '--proto', '=https', '--tlsv1.2',
        '--connect-timeout', '15', '--max-time', '90', '--retry', '2', '--retry-all-errors', '--retry-max-time', '240',
        '--max-filesize', String(entry.bytes), '--output', downloaded, entry.url],
        { timeout: 270000, maxBuffer: 65536 });
      if (call.status !== 0) throw Error('Source download failed: ' + entry.file + ': ' + String(call.stderr || call.error));
      if (statSync(downloaded).size !== entry.bytes) throw Error('Source size mismatch: ' + entry.file);
      const bytes = readFileSync(downloaded);
      if (sha(bytes) !== entry.sha256) throw Error('Source hash mismatch: ' + entry.file);
      writeFileSync(path, bytes, { flag: 'wx' });
    } finally { rmSync(temporary, { recursive: true, force: true }); }
  }
  const bytes = readFileSync(path);
  if (bytes.length !== entry.bytes || sha(bytes) !== entry.sha256) throw Error('Cached source mismatch: ' + entry.file);
  console.log('Verified ' + entry.file + ' ' + entry.sha256);
}

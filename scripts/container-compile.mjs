import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// Explicit reviewed inputs only; no host mounts or Docker-daemon path assumptions.
export function compileInContainer(image, files, command, after, timeout = 180000, profile = 'small') {
  if (!['small', 'candidate'].includes(profile)) throw Error('Unknown compiler profile');
  const workSize = profile === 'candidate' ? '512m' : '128m';
  const directory = mkdtempSync(join(process.env.WASM_BUILD_TMP || tmpdir(), 'prime-container-'));
  try {
    const names = Object.keys(files);
    for (const name of names) {
      if (!/^(src|build)\/[A-Za-z0-9_./-]+$/.test(name) || name.split('/').some(p => ['', '.', '..'].includes(p))) {
        throw Error('Invalid compiler input path');
      }
      const path = join(directory, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, files[name]);
    }
    const archive = spawnSync('tar', ['-cf', '-', '-C', directory, ...names],
      { timeout: 30000, maxBuffer: 8 * 1024 * 1024 });
    if (archive.status !== 0) throw Error(String(archive.stderr || archive.error));
    const result = spawnSync('docker', ['run', '--rm', '-i', '--network=none', '--cpus=2', '--memory=2g',
      '--pids-limit=128', '--cap-drop=ALL', '--security-opt=no-new-privileges',
      '--tmpfs', '/src:rw,size=16m', '--tmpfs', '/build:rw,size=16m', '--tmpfs', '/work:rw,exec,size=' + workSize,
      '-w', '/work', image, 'sh', '-c', 'tar --no-same-owner --no-same-permissions -xf - -C / && "$@" && ' + after, 'compile', ...command],
      { input: archive.stdout, timeout, maxBuffer: 8 * 1024 * 1024 });
    if (result.status !== 0) throw Error(String(result.stderr || result.error || 'Compiler failed'));
    return result.stdout;
  } finally {
    // Only this exact owned, freshly created directory is removed.
    rmSync(directory, { recursive: true, force: true });
  }
}

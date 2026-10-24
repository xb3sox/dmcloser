// Installs the repo's git hooks into .git/hooks (works on Windows and POSIX).
import { chmodSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const hooks = [['pre-push', 'pre-push']];

for (const [source, target] of hooks) {
  const from = join('scripts', 'git-hooks', source);
  const to = join('.git', 'hooks', target);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  try {
    chmodSync(to, 0o755);
  } catch {
    // Windows: the executable bit is meaningless; git still runs the hook via sh.
  }
  console.log(`installed ${to}`);
}

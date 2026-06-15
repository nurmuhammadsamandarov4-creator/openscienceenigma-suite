/* eslint-disable no-console */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Run a command (throws on failure)
function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${res.status}`);
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function unquarantine(targetPath) {
  // Remove macOS quarantine attribute recursively (best effort)
  if (!exists(targetPath)) return;
  try {
    run('xattr', ['-dr', 'com.apple.quarantine', targetPath]);
  } catch (e) {
    // Best effort: don't hard-fail here
    console.warn(`[prestart] xattr failed for ${targetPath}: ${e.message}`);
  }
}

function tryRequireBetterSqlite3() {
  try {
    // eslint-disable-next-line global-require
    require('better-sqlite3');
    return true;
  } catch (e) {
    console.warn('[prestart] better-sqlite3 load failed:', e && e.message ? e.message : e);
    return false;
  }
}

(function main() {
  if (process.platform !== 'darwin') {
    process.exit(0);
  }

  // Ensure we run from the server directory
  process.chdir(path.join(__dirname, '..'));

  console.log('[prestart] macOS detected — applying Gatekeeper fixes for native modules…');

  const betterSqlite3Dir = path.join(process.cwd(), 'node_modules', 'better-sqlite3');
  const betterSqlite3Node = path.join(
    betterSqlite3Dir,
    'build',
    'Release',
    'better_sqlite3.node'
  );

  // Best-effort: remove quarantine
  unquarantine(betterSqlite3Dir);
  unquarantine(betterSqlite3Node);

  // If it loads now, we're done
  if (tryRequireBetterSqlite3()) {
    console.log('[prestart] better-sqlite3 OK.');
    process.exit(0);
  }

  // Otherwise, attempt a rebuild from source (requires Xcode tools)
  console.log('[prestart] Attempting to rebuild better-sqlite3 from source…');
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  try {
    run(npmCmd, ['rebuild', 'better-sqlite3', '--build-from-source']);
  } catch (e) {
    console.error('\n[prestart] Rebuild failed.');
    console.error('Most likely you need Xcode Command Line Tools:');
    console.error('  xcode-select --install\n');
    console.error('Then run (inside your project):');
    console.error('  cd server');
    console.error('  rm -rf node_modules package-lock.json');
    console.error('  npm install');
    console.error('  npm rebuild better-sqlite3 --build-from-source\n');
    process.exit(1);
  }

  // Remove quarantine again after rebuild (sometimes files are still marked)
  unquarantine(betterSqlite3Dir);
  unquarantine(betterSqlite3Node);

  if (tryRequireBetterSqlite3()) {
    console.log('[prestart] better-sqlite3 rebuilt and loaded successfully.');
    process.exit(0);
  }

  console.error('\n[prestart] better-sqlite3 still cannot be loaded.');
  console.error('Try these commands manually:');
  console.error('  xcode-select --install');
  console.error('  cd server');
  console.error('  rm -rf node_modules package-lock.json');
  console.error('  npm install');
  console.error('  npm rebuild better-sqlite3 --build-from-source');
  process.exit(1);
})();

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const unit = new Set(['rules', 'storage', 'library-casing', 'itunes-store', 'artwork-store', 'albumless-store', 'beta-store', 'release', 'runner']);

function runSuites(files, { timeout = 180000, report = console.log } = {}) {
  return files.map(file => {
    const name = path.basename(file, '.cjs'), start = Date.now();
    report(`Running ${name}…`);
    const child = spawnSync(process.execPath, [file], { cwd: root, env: process.env,
      stdio: 'inherit', timeout, shell: false });
    const result = { name, status: child.status, signal: child.signal,
      error: child.error?.code || null, passed: child.status === 0 && !child.error,
      milliseconds: Date.now() - start };
    report(`${result.passed ? 'PASS' : 'FAIL'} ${name} (${result.milliseconds} ms)` +
      (result.error ? `: ${result.error}` : result.signal ? `: ${result.signal}` : ''));
    return result;
  });
}

function main(args) {
  const flags = args.filter(arg => arg.startsWith('--'));
  if (flags.some(flag => !['--list', '--unit'].includes(flag))) throw new Error('Use --list, --unit, or suite names.');
  const available = fs.readdirSync(__dirname).filter(name => name.endsWith('.cjs') &&
    !['harness.cjs', 'run.cjs'].includes(name)).map(name => name.slice(0, -4)).sort();
  const selected = [...new Set(args.filter(arg => !arg.startsWith('--')).map(name => name.replace(/\.cjs$/, '')))];
  if (selected.some(name => !available.includes(name))) throw new Error('Unknown suite. Run node tests/run.cjs --list to see the choices.');
  let suites = selected.length ? selected : available;
  if (flags.includes('--unit')) {
    if (selected.some(name => !unit.has(name))) throw new Error('A selected suite needs a browser; omit --unit.');
    suites = suites.filter(name => unit.has(name));
  }
  if (flags.includes('--list')) { console.log(suites.join('\n')); return; }
  if (suites.some(name => !unit.has(name))) {
    let chromium;
    try { ({ chromium } = require('playwright')); }
    catch { throw new Error('Playwright is unavailable. Set NODE_PATH to your existing Playwright installation (see README).'); }
    const executable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || chromium.executablePath();
    if (!fs.existsSync(executable)) throw new Error('Chromium is unavailable. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to an existing browser (see README).');
  }
  const results = runSuites(suites.map(name => path.join(__dirname, name + '.cjs')));
  const failed = results.filter(result => !result.passed);
  console.log(`\n${results.length - failed.length}/${results.length} suites passed.`);
  if (failed.length) {
    console.error('Failed suites: ' + failed.map(result => result.name).join(', '));
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
module.exports = { runSuites };

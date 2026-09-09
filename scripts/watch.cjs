const { spawn } = require('node:child_process');
const chokidar = require('chokidar');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
let building = false;
let pending = false;
function build() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  const child = spawn(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' });
  child.on('error', (error) => {
    console.error(error);
    process.exitCode = 1;
  });
  child.on('close', () => {
    building = false;
    if (pending) {
      pending = false;
      build();
    }
  });
}
chokidar
  .watch(['src/**/*.ts', 'tsconfig*.json'], { cwd: root, ignoreInitial: true })
  .on('all', build)
  .on('ready', build);

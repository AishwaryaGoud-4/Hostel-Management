const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = fs.realpathSync(path.join(__dirname, '..'));
const nextBin = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const child = spawn(process.execPath, [nextBin, 'dev', ...process.argv.slice(2)], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

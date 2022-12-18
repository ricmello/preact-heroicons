import { exec } from 'child_process';
import { readFile } from 'fs/promises';
import { exit } from 'process';

function execShellCommand(cmd) {
  return new Promise((res) => {
    exec(cmd, (error, stdout, stderr) => {
      res(stdout ? stdout : stderr);
    });
  });
}

const npmVersion = (
  await execShellCommand('npm info preact-heroicons version')
).trim();
const ourPackage = await readFile('package.json', 'utf8').then((data) =>
  JSON.parse(data)
);
const localVersion = ourPackage.version;

const isOutdated = npmVersion !== localVersion;

if (!isOutdated) exit(1);

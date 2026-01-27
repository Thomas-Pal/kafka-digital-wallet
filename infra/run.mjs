import { spawn } from 'node:child_process';

const mode = process.argv[2];

const runCommand = (command, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${command}`));
    });
  });

const runParallel = (commands) => {
  const children = commands.map((command) =>
    spawn(command, {
      stdio: 'inherit',
      shell: true,
    }),
  );

  const teardown = () => {
    children.forEach((child) => {
      if (!child.killed) child.kill('SIGINT');
    });
  };

  process.on('SIGINT', () => {
    teardown();
    process.exit(0);
  });

  return new Promise((resolve, reject) => {
    let finished = 0;
    let failed = false;

    children.forEach((child, index) => {
      child.on('exit', (code) => {
        if (failed) return;
        if (code !== 0) {
          failed = true;
          teardown();
          reject(new Error(`Command failed (${code}): ${commands[index]}`));
          return;
        }
        finished += 1;
        if (finished === children.length) resolve();
      });
    });
  });
};

const commands = {
  services: ['npm run svc:orchestrator', 'npm run svc:gatekeeper', 'npm run svc:dwp'],
  dev: ['npm run svc:orchestrator', 'npm run svc:gatekeeper', 'npm run svc:dwp', 'npm run wallet', 'npm run portal'],
};

const main = async () => {
  if (!mode || !(mode in commands)) {
    throw new Error('Usage: node infra/run.mjs <services|dev>');
  }

  if (mode === 'dev') {
    await runCommand('npm run kill-ports');
    await runCommand('npm run reset:kafka');
    await runCommand('npm run up:kafka');
    await runCommand('npm run topics');
  }

  if (mode === 'services') {
    await runCommand('npm run kill-ports');
  }

  await runParallel(commands[mode]);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

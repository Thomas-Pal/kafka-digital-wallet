import { execSync } from 'node:child_process';

const ports = ['4000', '5001', '5002', '5173', '5174', '5175', '5176'];

const killPort = (port) => {
  try {
    const output = execSync(`lsof -ti :${port}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (!output) return;
    const pids = output.split(/\s+/).filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGKILL');
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
};

ports.forEach(killPort);

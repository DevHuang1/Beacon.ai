import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] === 'start' ? 'start' : 'dev';
const host = process.env.HOST || '0.0.0.0';
const requestedPort = Number(process.env.PORT || 0);
const port = await findAvailablePort(requestedPort);

console.log(`[run-next] Starting Next.js in ${mode} mode on http://${host}:${port}`);

const nextBinary = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url));
const child = spawn(process.execPath, [nextBinary, mode, '--hostname', host, '--port', String(port)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HOST: host,
    PORT: String(port),
  },
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[run-next] Failed to start Next.js', error);
  process.exit(1);
});

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
        return;
      }

      reject(error);
    });

    server.listen(startPort, () => {
      const address = server.address();
      const chosenPort = typeof address === 'object' && address ? address.port : startPort;

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(chosenPort);
      });
    });
  });
}

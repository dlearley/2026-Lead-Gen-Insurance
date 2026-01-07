import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../..');

function run(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    stdio: 'inherit',
    ...options,
  });

  if (res.error) throw res.error;
  if (typeof res.status === 'number' && res.status !== 0) {
    process.exit(res.status);
  }
}

function runCapture(cmd, args, options = {}) {
  const res = spawnSync(cmd, args, {
    encoding: 'utf-8',
    ...options,
  });

  if (res.error) throw res.error;
  if (typeof res.status === 'number' && res.status !== 0) {
    const stderr = res.stderr?.toString?.() ?? '';
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status}${stderr ? `\n${stderr}` : ''}`);
  }

  return (res.stdout ?? '').toString().trim();
}

async function waitForPostgres(containerId, user, db, timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const res = spawnSync(
      'docker',
      ['exec', containerId, 'pg_isready', '-U', user, '-d', db],
      { stdio: 'ignore' }
    );

    if (res.status === 0) return;
    await delay(500);
  }

  throw new Error('Postgres did not become ready in time');
}

async function main() {
  const image = process.env.TEST_POSTGRES_IMAGE ?? 'postgres:16-alpine';
  const user = process.env.TEST_POSTGRES_USER ?? 'postgres';
  const password = process.env.TEST_POSTGRES_PASSWORD ?? 'postgres';
  const db = process.env.TEST_POSTGRES_DB ?? 'insurance_lead_gen_test';

  const env = {
    ...process.env,
    NODE_ENV: 'test',
  };

  let containerId;

  try {
    containerId = runCapture(
      'docker',
      [
        'run',
        '-d',
        '-P',
        '--rm',
        '-e',
        `POSTGRES_USER=${user}`,
        '-e',
        `POSTGRES_PASSWORD=${password}`,
        '-e',
        `POSTGRES_DB=${db}`,
        image,
      ],
      { env }
    );

    const portLine = runCapture('docker', ['port', containerId, '5432/tcp'], { env });
    const port = portLine.split(':').pop();
    if (!port) throw new Error(`Failed to determine mapped port from: ${portLine}`);

    await waitForPostgres(containerId, user, db);

    const databaseUrl = `postgresql://${user}:${password}@127.0.0.1:${port}/${db}?schema=public`;
    env.DATABASE_URL = databaseUrl;

    run(
      'pnpm',
      ['-w', 'prisma', 'db', 'push', '--schema', path.join(rootDir, 'prisma/schema.prisma'), '--skip-generate'],
      { env, cwd: rootDir }
    );

    run('pnpm', ['-w', 'turbo', 'test', '--concurrency=1'], { env, cwd: rootDir });
  } finally {
    if (containerId) {
      spawnSync('docker', ['rm', '-f', containerId], { stdio: 'inherit' });
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

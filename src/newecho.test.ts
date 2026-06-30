// Do not delete this file
import request from 'sync-request-curl';
import { ChildProcess, spawn } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));

const port = config.port;
const url = config.url;
let server: ChildProcess;

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      request('GET', `${url}:${port}/`, { timeout: 200 });
      return;
    } catch {
      sleepSync(100);
    }
  }
  throw new Error('Server did not start in time for HTTP tests');
}

beforeAll(() => {
  server = spawn('npm', ['run', 'start'], {
    cwd: process.cwd(),
    stdio: 'pipe',
  });
  waitForServer();
});

afterAll(() => {
  server.kill('SIGINT');
});

describe('HTTP tests using Vitest and sync-request-curl', () => {
  test('successful echo', () => {
    const res = request(
      'GET',
      `${url}:${port}/echo`,
      {
        qs: {
          echo: 'Hello'
        },
        // adding a timeout will help you spot when your server hangs
        timeout: 100
      }
    );
    const bodyObj = JSON.parse(res.body.toString());

    expect(res.statusCode).toStrictEqual(200);
    expect(bodyObj).toStrictEqual({ value: 'Hello' });
  });

  test('invalid echo', () => {
    const res = request(
      'GET',
      `${url}:${port}/echo`,
      {
        qs: {
          echo: 'echo'
        },
        timeout: 100
      }
    );
    const bodyObj = JSON.parse(res.body.toString());

    expect(res.statusCode).toStrictEqual(400);
    expect(bodyObj).toStrictEqual({ error: 'INVALID_ECHO', message: expect.any(String) });
  });
});

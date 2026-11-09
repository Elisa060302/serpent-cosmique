import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer, connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

const PORT = 4173;
const DIST = resolve('dist');

interface RawResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Envoie une requête HTTP écrite à la main, sans aucune normalisation du chemin. */
function raw(
  method: string,
  target: string,
  host: string | null = `127.0.0.1:${PORT}`,
  port = PORT,
): Promise<RawResponse> {
  return new Promise((resolveResponse, reject) => {
    const socket = connect({ host: '127.0.0.1', port });
    let data = '';
    socket.setEncoding('utf8');
    socket.on('data', (chunk: string) => (data += chunk));
    socket.on('error', reject);
    socket.on('close', () => {
      const [head = '', ...rest] = data.split('\r\n\r\n');
      const [statusLine = '', ...headerLines] = head.split('\r\n');
      const headers: Record<string, string> = {};
      for (const line of headerLines) {
        const index = line.indexOf(':');
        headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
      }
      resolveResponse({
        status: Number(statusLine.split(' ')[1]),
        headers,
        body: rest.join('\r\n\r\n'),
      });
    });
    const hostLine = host === null ? '' : `Host: ${host}\r\n`;
    socket.write(`${method} ${target} HTTP/1.1\r\n${hostLine}Connection: close\r\n\r\n`);
  });
}

test.describe('ct_121_serveur_local', () => {
  test('les chemins hors de dist/ donnent 404, y compris encodés ou avec un octet nul', async () => {
    const targets = [
      '/..%2f..%2fpackage.json',
      '/%2e%2e/',
      '/%2e%2e%2fpackage.json',
      '/%2E%2E/package.json',
      '/../package.json',
      '/icons/../../package.json',
      '/..\\package.json',
      '/index.html%00.png',
      '/%00',
      '/%zz',
    ];
    for (const target of targets) {
      const response = await raw('GET', target);
      expect(response.status, target).toBe(404);
      expect(response.body, target).not.toContain('serpent-cosmique');
    }
  });

  test('un octet nul brut n’est jamais servi', async () => {
    const response = await raw('GET', '/index.html\u0000.png');
    expect([400, 404]).toContain(response.status);
  });

  test('un lien symbolique sortant de dist/ n’est pas suivi', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'serpent-sentinelle-'));
    writeFileSync(join(outside, 'sentinelle.txt'), 'secret fictif');
    const suffix = randomUUID();
    const directoryLink = join(DIST, `lien-dossier-${suffix}`);
    const fileLink = join(DIST, `lien-fichier-${suffix}.txt`);
    try {
      symlinkSync(outside, directoryLink);
      symlinkSync(join(outside, 'sentinelle.txt'), fileLink);
      for (const target of [
        `/lien-dossier-${suffix}/sentinelle.txt`,
        `/lien-dossier-${suffix}`,
        `/lien-fichier-${suffix}.txt`,
      ]) {
        const response = await raw('GET', target);
        expect(response.status, target).toBe(404);
        expect(response.body, target).not.toContain('secret fictif');
      }
    } finally {
      rmSync(directoryLink, { force: true });
      rmSync(fileLink, { force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test('aucune liste de répertoire', async () => {
    for (const target of ['/icons', '/icons/']) {
      expect((await raw('GET', target)).status, target).toBe(404);
    }
  });

  test('l’en-tête Host est limité à 127.0.0.1 et localhost avec le port du serveur', async () => {
    for (const host of ['exemple.test', `exemple.test:${PORT}`, '127.0.0.1', 'localhost', null]) {
      expect((await raw('GET', '/', host)).status, String(host)).toBe(421);
    }
    expect((await raw('GET', '/', `127.0.0.1:${PORT}`)).status).toBe(200);
    expect((await raw('GET', '/', `localhost:${PORT}`)).status).toBe(200);
  });

  test('seules les méthodes GET et HEAD sont acceptées', async () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
      expect((await raw(method, '/')).status, method).toBe(405);
    }
    const head = await raw('HEAD', '/');
    expect(head.status).toBe(200);
    expect(head.body).toBe('');
    expect(Number(head.headers['content-length'])).toBeGreaterThan(0);
  });

  test('aucun en-tête de sécurité ajouté et type de contenu exact', async () => {
    const response = await raw('GET', '/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
    for (const name of [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'strict-transport-security',
      'permissions-policy',
      'cross-origin-opener-policy',
      'cross-origin-resource-policy',
      'access-control-allow-origin',
    ]) {
      expect(response.headers, name).not.toHaveProperty(name);
    }
    expect(response.body).toMatch(/<head>\s*<meta\s+http-equiv="Content-Security-Policy"/);
  });

  test('écoute sur 127.0.0.1 seulement', async () => {
    const free = await new Promise<number>((resolvePort, reject) => {
      const probe = createServer();
      probe.on('error', reject);
      probe.listen(0, '127.0.0.1', () => {
        const address = probe.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        probe.close(() => resolvePort(port));
      });
    });
    const child: ChildProcess = spawn(process.execPath, ['scripts/serve.mjs'], {
      env: { ...process.env, PORT: String(free) },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    try {
      await new Promise<void>((ready, reject) => {
        child.once('error', reject);
        child.stdout?.once('data', () => ready());
      });
      expect((await raw('GET', '/', `127.0.0.1:${free}`, free)).status).toBe(200);
      await expect(
        new Promise<void>((accepted, refused) => {
          const socket = connect({ host: '127.0.0.2', port: free });
          socket.on('connect', () => {
            socket.destroy();
            accepted();
          });
          socket.on('error', refused);
        }),
      ).rejects.toThrow();
    } finally {
      child.kill();
    }
  });
});

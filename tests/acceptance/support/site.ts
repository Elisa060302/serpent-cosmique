/**
 * Site publié simulé pour les tests d'installation et de mise à jour : un petit serveur HTTP qui sert, à tour de
 * rôle, plusieurs constructions du jeu (versions différentes, fichier altéré), compte tout ce qui lui est demandé
 * (en-têtes et corps) et peut refuser de répondre (téléphone sans réseau) ou couper une connexion en cours de route.
 */
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeSite } from '../../../scripts/site.mjs';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

export interface SiteExchange {
  path: string;
  status: number;
  /** En-têtes et corps, requête et réponse. */
  bytes: number;
  /** Requête refusée parce que le téléphone n'a pas de réseau, ou connexion coupée par le test. */
  refused: boolean;
}

export interface TestSite {
  origin: string;
  /** Tout ce qui a été demandé au serveur, dans l'ordre. */
  exchanges: SiteExchange[];
  /** Sert une autre construction à partir de maintenant. */
  serve(directory: string): void;
  /** Mode avion : toute requête est refusée (et notée). */
  setOffline(offline: boolean): void;
  /** Coupe la connexion quand ce chemin est demandé (null : plus aucune coupure). */
  cutOn(path: string | null): void;
  close(): Promise<void>;
}

const directories: string[] = [];

/**
 * Copie de `dist/` faite une fois par processus de test : une reconstruction de `dist/` qui se produit pendant
 * la suite (qui la supprime puis la recrée) ne gêne plus les tests suivants. La copie elle-même est reprise
 * si `dist/` disparaît pendant qu'on la lit.
 */
let snapshot: string | null = null;

function distSnapshot(): string {
  if (snapshot !== null) return snapshot;
  for (let attempt = 1; ; attempt += 1) {
    const directory = mkdtempSync(join(tmpdir(), 'serpent-dist-'));
    try {
      cpSync(join(ROOT, 'dist'), directory, { recursive: true });
    } catch (error) {
      rmSync(directory, { recursive: true, force: true });
      if (attempt === 5) throw error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      continue;
    }
    process.once('exit', () => rmSync(directory, { recursive: true, force: true }));
    snapshot = directory;
    return directory;
  }
}

/** Construction du jeu dans un répertoire temporaire : copie de `dist/` finalisée avec cette version. */
export function buildVersion(version: string, options: { tamper?: string } = {}): string {
  const directory = mkdtempSync(join(tmpdir(), 'serpent-site-'));
  directories.push(directory);
  cpSync(distSnapshot(), directory, { recursive: true });
  finalizeSite({ root: ROOT, dir: directory, version });
  if (options.tamper !== undefined) {
    // Le fichier est modifié après le calcul des empreintes : celle de sw.js ne correspond plus.
    const file = join(directory, options.tamper);
    writeFileSync(file, `${readFileSync(file, 'utf8')}\n// fichier altéré\n`);
  }
  return directory;
}

export function removeBuilds(): void {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
}

function headerBytes(request: IncomingMessage): number {
  return Buffer.byteLength(
    `${request.method ?? 'GET'} ${request.url ?? ''} HTTP/1.1\r\n${request.rawHeaders.join('\r\n')}\r\n\r\n`,
  );
}

/** `prefix` : sous-dossier de publication (« /serpent-cosmique/ »), « / » pour la racine. */
export async function startSite(initial: string, prefix = '/'): Promise<TestSite> {
  let root = initial;
  let offline = false;
  let cut: string | null = null;
  const exchanges: SiteExchange[] = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://hote');
    const relative = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : null;
    const record = (status: number, bytes: number, refused = false): void => {
      exchanges.push({ path: url.pathname, status, bytes: bytes + headerBytes(request), refused });
    };
    if (offline || (cut !== null && url.pathname === cut)) {
      record(0, 0, true);
      request.socket.destroy();
      return;
    }
    const target =
      relative === null ? null : join(root, normalize(relative === '' ? 'index.html' : relative));
    if (
      target === null ||
      !target.startsWith(root + sep) ||
      !existsSync(target) ||
      !statSync(target).isFile()
    ) {
      const body = Buffer.from('Introuvable\n');
      response.writeHead(404, { 'Content-Type': 'text/plain', 'Content-Length': body.length });
      response.end(body);
      record(404, body.length + 90);
      return;
    }
    const body = readFileSync(target);
    const etag = `"${createHash('sha1').update(body).digest('hex')}"`;
    const headers: Record<string, string | number> = {
      'Content-Type': TYPES[extname(target)] ?? 'application/octet-stream',
      ETag: etag,
      'Cache-Control': 'max-age=600',
    };
    const unchanged = request.headers['if-none-match'] === etag;
    if (unchanged) {
      response.writeHead(304, headers);
      response.end();
      record(304, 120);
      return;
    }
    headers['Content-Length'] = body.length;
    response.writeHead(200, headers);
    response.end(body);
    record(200, body.length + 160);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  return {
    origin: `http://127.0.0.1:${port}`,
    exchanges,
    serve(directory) {
      root = directory;
    },
    setOffline(value) {
      offline = value;
    },
    cutOn(path) {
      cut = path;
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}

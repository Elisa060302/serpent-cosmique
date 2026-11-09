// Serveur statique local pour le développement et les tests : sert dist/ sur 127.0.0.1 seulement.
// GET et HEAD uniquement ; chemins confinés à dist/ ; en-tête Host contrôlé ; aucune liste de répertoire ;
// aucun en-tête de sécurité ajouté (le site publié n'en a pas non plus).
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { fileURLToPath } from 'node:url';

const HOST = '127.0.0.1';
const port = Number(process.env.PORT ?? 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  process.stderr.write('Port invalide : indiquez un entier de 1 à 65535 dans PORT.\n');
  process.exit(1);
}

let distRoot;
try {
  distRoot = await realpath(fileURLToPath(new URL('../dist', import.meta.url)));
} catch {
  process.stderr.write('Dossier dist/ introuvable : lancez d’abord « npm run build ».\n');
  process.exit(1);
}

const ALLOWED_HOSTS = new Set([`${HOST}:${port}`, `localhost:${port}`]);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

function isInside(candidate) {
  return candidate.startsWith(distRoot + path.sep);
}

/** Chemin réel du fichier demandé, ou null s'il sort de dist/ ou n'existe pas. */
async function findFile(requestTarget) {
  const rawPath = requestTarget.split('?')[0];
  if (!rawPath.startsWith('/')) return null;
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;

  let candidate = path.resolve(distRoot, `.${decoded}`);
  if (candidate !== distRoot && !isInside(candidate)) return null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let real;
    let info;
    try {
      real = await realpath(candidate);
      info = await stat(real);
    } catch {
      return null;
    }
    if (real !== distRoot && !isInside(real)) return null;
    if (!info.isDirectory()) return real === distRoot ? null : real;
    candidate = path.join(real, 'index.html');
  }
  return null;
}

function reply(response, status, text, extraHeaders = {}) {
  const body = Buffer.from(`${text}\n`, 'utf8');
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.length,
    ...extraHeaders,
  });
  response.end(body);
}

const server = createServer({ requireHostHeader: false }, async (request, response) => {
  if (!ALLOWED_HOSTS.has(request.headers.host ?? '')) {
    reply(response, 421, 'Hôte non autorisé');
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    reply(response, 405, 'Méthode non autorisée', { Allow: 'GET, HEAD' });
    return;
  }
  const file = await findFile(request.url ?? '');
  if (file === null) {
    reply(response, 404, 'Introuvable');
    return;
  }
  const { size } = await stat(file);
  response.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
    'Content-Length': size,
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  pipeline(createReadStream(file), response, (error) => {
    if (error) response.destroy();
  });
});

server.listen(port, HOST, () => {
  process.stdout.write(`Serveur local : http://${HOST}:${port}/\n`);
});

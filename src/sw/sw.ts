// Agent de service : il ne sert que des fichiers du cache (« cache seul ») et ne parle au réseau que pour
// installer ou mettre à jour le jeu. Il ne reçoit aucun message des pages.
// La construction remplace les deux lignes suivantes (version, puis « chemin empreinte » une ligne par fichier).
const VERSION = '__VERSION__';
const FILES = '__FILES__';

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE_PREFIX = 'serpent-cosmique-';
const CACHE_NAME = `${CACHE_PREFIX}${VERSION}`;
const CONSENT_CACHE = `${CACHE_PREFIX}consent`;
const OFFER_CACHE = `${CACHE_PREFIX}offer`;

/** Adresse de l'entrée unique d'un cache de service (consentement, version proposée). */
function entryUrl(): string {
  return new URL('./version', worker.registration.scope).href;
}

async function readEntry(cacheName: string): Promise<string | null> {
  const response = await caches.match(entryUrl(), { cacheName });
  return response === undefined ? null : response.text();
}

async function writeEntry(cacheName: string, value: string): Promise<void> {
  await (await caches.open(cacheName)).put(entryUrl(), new Response(value));
}

/** Télécharge un fichier du site ; refuse toute réponse redirigée, non `ok` ou d'empreinte fausse (EXS-17). */
async function download(path: string, digest: string): Promise<[string, Response]> {
  const url = new URL(path, worker.registration.scope).href;
  const response = await fetch(url, { cache: 'reload' });
  if (!response.ok || response.type !== 'basic' || response.redirected) {
    throw new Error(`Réponse refusée : ${path}`);
  }
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()),
  );
  if (btoa(String.fromCharCode(...hash)).replace(/=+$/, '') !== digest) {
    throw new Error(`Empreinte fausse : ${path}`);
  }
  return [url, response];
}

/** Remplit le cache de la version, seulement une fois tous les fichiers vérifiés. */
async function precache(): Promise<void> {
  const files = FILES.split('\n').map((line) => line.split(' ') as [string, string]);
  const verified = await Promise.all(files.map(([path, digest]) => download(path, digest)));
  await caches.delete(CACHE_NAME);
  try {
    const cache = await caches.open(CACHE_NAME);
    for (const [url, response] of verified) await cache.put(url, response);
  } catch (error) {
    await caches.delete(CACHE_NAME);
    throw error;
  }
}

async function install(): Promise<void> {
  // Un agent déjà actif : la nouvelle version ne s'installe qu'avec l'accord du joueur pour cette version.
  if (worker.registration.active !== null && (await readEntry(CONSENT_CACHE)) !== VERSION) {
    await writeEntry(OFFER_CACHE, VERSION);
    throw new Error('Mise à jour non consentie');
  }
  await precache();
  await worker.skipWaiting();
}

async function activate(): Promise<void> {
  for (const name of await caches.keys()) {
    if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
  }
  await worker.clients.claim();
}

async function answer(url: URL): Promise<Response> {
  const path =
    url.pathname.slice(new URL(worker.registration.scope).pathname.length) || 'index.html';
  const cached = await caches.match(new URL(path, worker.registration.scope).href, {
    cacheName: CACHE_NAME,
  });
  return cached ?? new Response('Introuvable', { status: 404 });
}

worker.addEventListener('install', (event) => event.waitUntil(install()));
worker.addEventListener('activate', (event) => event.waitUntil(activate()));
worker.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const inScope =
    url.origin === worker.location.origin && url.href.startsWith(worker.registration.scope);
  if (event.request.method === 'GET' && inScope) event.respondWith(answer(url));
});

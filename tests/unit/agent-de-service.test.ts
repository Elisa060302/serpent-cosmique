import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { describe, it } from 'node:test';
import vm from 'node:vm';

const SCOPE = 'http://127.0.0.1:4173/jeu/';
const SOURCE = readFileSync('src/sw/sw.ts', 'utf8');

const digestOf = (text: string): string =>
  createHash('sha256').update(text).digest('base64').replace(/=+$/, '');

type Listener = (event: Record<string, unknown>) => void;

interface Reply {
  body?: string;
  status?: number;
  type?: ResponseType;
  redirected?: boolean;
}

/** Réseau, Cache Storage et agent de service simulés : l'agent est exécuté tel qu'il est écrit. */
function createWorld(options: {
  version?: string;
  site: Record<string, Reply>;
  digests?: Record<string, string>;
  active?: boolean;
  consent?: string;
}) {
  const stores = new Map<string, Map<string, Response>>();
  if (options.consent !== undefined) {
    stores.set(
      'serpent-cosmique-consent',
      new Map([[`${SCOPE}version`, new Response(options.consent)]]),
    );
  }
  const requests: { url: string; init: unknown }[] = [];
  const listeners = new Map<string, Listener>();
  const version = options.version ?? '1.1.0';
  const files = Object.entries(options.site)
    .map(([path, reply]) => `${path} ${options.digests?.[path] ?? digestOf(reply.body ?? '')}`)
    .join('\n');
  const worldCaches = {
    keys: () => Promise.resolve([...stores.keys()]),
    delete: (name: string) => Promise.resolve(stores.delete(name)),
    open: (name: string) => {
      const store = stores.get(name) ?? new Map<string, Response>();
      stores.set(name, store);
      return Promise.resolve({
        put: (url: string, response: Response) => {
          store.set(url, response);
          return Promise.resolve();
        },
      });
    },
    match: (url: string, init?: { cacheName?: string }) =>
      Promise.resolve(stores.get(init?.cacheName ?? '')?.get(url)),
  };
  const sandbox = {
    self: {
      registration: { scope: SCOPE, active: options.active === false ? null : {} },
      location: new URL(`${SCOPE}sw.js`),
      addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: worldCaches,
    crypto,
    btoa,
    URL,
    Uint8Array,
    Response,
    Error,
    String,
    Promise,
    fetch: (url: string, init: unknown) => {
      requests.push({ url, init });
      const reply = options.site[url.slice(SCOPE.length)];
      if (reply === undefined) return Promise.resolve(new Response('', { status: 404 }));
      const response = new Response(reply.body ?? '', { status: reply.status ?? 200 });
      Object.defineProperty(response, 'type', { value: reply.type ?? 'basic' });
      Object.defineProperty(response, 'redirected', { value: reply.redirected ?? false });
      return Promise.resolve(response);
    },
  };
  const script = stripTypeScriptTypes(SOURCE)
    .replace("'__VERSION__'", JSON.stringify(version))
    .replace("'__FILES__'", JSON.stringify(files));
  vm.runInNewContext(script, sandbox);

  const run = async (type: 'install' | 'activate'): Promise<unknown> => {
    let pending: Promise<unknown> = Promise.resolve();
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => (pending = promise) });
    return pending;
  };
  const fetchEvent = (url: string, method = 'GET') => {
    const record: { replied: Promise<Response> | null } = { replied: null };
    listeners.get('fetch')?.({
      request: { url, method },
      respondWith: (promise: Promise<Response>) => (record.replied = promise),
    });
    return record;
  };
  return {
    stores,
    requests,
    listeners,
    install: () => run('install'),
    activate: () => run('activate'),
    fetchEvent,
  };
}

const SITE = {
  'index.html': { body: '<html>jeu</html>' },
  'main.js': { body: 'export {}' },
};

describe('ct_120_manifeste : agent de service restreint (EXS-17)', () => {
  it('n’écoute que install, activate et fetch : aucun message de la page n’est traité', () => {
    const { listeners } = createWorld({ site: SITE, active: false });
    assert.deepEqual([...listeners.keys()].sort(), ['activate', 'fetch', 'install']);
  });

  it('ne répond qu’aux GET de son origine et de sa portée', async () => {
    const world = createWorld({ site: SITE, active: false });
    await world.install();
    for (const [url, method] of [
      [`${SCOPE}main.js`, 'POST'],
      [`${SCOPE}main.js`, 'PUT'],
      [`${SCOPE}main.js`, 'HEAD'],
      ['http://127.0.0.1:4173/main.js', 'GET'],
      ['http://127.0.0.1:4173/jeu-autre/main.js', 'GET'],
      ['http://exemple.test:4173/jeu/main.js', 'GET'],
      ['https://127.0.0.1:4173/jeu/main.js', 'GET'],
    ] as const) {
      assert.equal(world.fetchEvent(url, method).replied, null, `${method} ${url}`);
    }
    const reply = world.fetchEvent(`${SCOPE}main.js?seed=3`).replied;
    assert.equal(await (await reply)?.text(), 'export {}', 'la requête de recette est ignorée');
    assert.equal(await (await world.fetchEvent(SCOPE).replied)?.text(), '<html>jeu</html>');
  });

  it('cache seul : une ressource absente reçoit une erreur, jamais le réseau', async () => {
    const world = createWorld({ site: SITE, active: false });
    await world.install();
    const installRequests = world.requests.length;
    const response = await world.fetchEvent(`${SCOPE}autre.js`).replied;
    assert.equal(response?.status, 404);
    assert.equal(world.requests.length, installRequests);
  });

  it('seule une réponse ok, basic, non redirigée et d’empreinte exacte entre dans le cache', async () => {
    const cases: [string, Record<string, Reply>, Record<string, string>?][] = [
      ['non ok', { 'index.html': { body: 'a', status: 500 } }],
      ['redirigée', { 'index.html': { body: 'a', redirected: true } }],
      ['opaque', { 'index.html': { body: 'a', type: 'opaque' } }],
      ['cors', { 'index.html': { body: 'a', type: 'cors' } }],
      ['empreinte fausse', { 'index.html': { body: 'a' } }, { 'index.html': digestOf('b') }],
    ];
    for (const [name, site, digests] of cases) {
      const world = createWorld({
        site: { ...site, 'main.js': { body: 'ok' } },
        ...(digests === undefined ? {} : { digests }),
        active: false,
      });
      await assert.rejects(world.install(), name);
      assert.equal(world.stores.has('serpent-cosmique-1.1.0'), false, `${name} : cache laissé`);
    }
  });

  it('télécharge sans le cache HTTP et met en cache tous les fichiers d’une version intacte', async () => {
    const world = createWorld({ site: SITE, active: false });
    await world.install();
    assert.equal(world.stores.get('serpent-cosmique-1.1.0')?.size, 2);
    for (const request of world.requests) {
      assert.equal((request.init as { cache: string }).cache, 'reload');
    }
  });
});

describe('ct_66_mise_a_jour_consentie : l’agent ne remplace jamais seul une version active (EXS-16)', () => {
  it('sans consentement : refus d’installer, aucun téléchargement, version proposée notée', async () => {
    const world = createWorld({ site: SITE, active: true });
    await assert.rejects(world.install());
    assert.equal(world.requests.length, 0);
    assert.equal(
      await world.stores.get('serpent-cosmique-offer')?.get(`${SCOPE}version`)?.text(),
      '1.1.0',
    );
    assert.equal(world.stores.has('serpent-cosmique-1.1.0'), false);
  });

  it('un consentement donné pour une autre version ne vaut pas', async () => {
    const world = createWorld({ site: SITE, active: true, consent: '1.0.5' });
    await assert.rejects(world.install());
    assert.equal(world.requests.length, 0);
  });

  it('avec le consentement pour cette version : installation, puis nettoyage des anciens caches', async () => {
    const world = createWorld({ site: SITE, active: true, consent: '1.1.0' });
    world.stores.set('serpent-cosmique-1.0.0', new Map());
    world.stores.set('serpent-cosmique-offer', new Map());
    world.stores.set('cache-d-un-autre-site', new Map());
    await world.install();
    assert.equal(world.stores.get('serpent-cosmique-1.1.0')?.size, 2);
    await world.activate();
    assert.deepEqual([...world.stores.keys()].sort(), [
      'cache-d-un-autre-site',
      'serpent-cosmique-1.1.0',
    ]);
  });
});

describe('ct_71_analyse_statique : réseau de l’agent de service (EXS-17)', () => {
  it('un seul appel à fetch, dans le téléchargement de l’installation', () => {
    assert.equal(SOURCE.match(/\bfetch\(/g)?.length, 1);
    assert.match(SOURCE, /async function download\([^)]*\)[^{]*\{[^}]*await fetch\(/);
  });

  it('aucun gestionnaire de message, aucune réponse construite à partir du réseau', () => {
    assert.doesNotMatch(SOURCE, /'message'|onmessage|postMessage/);
  });
});

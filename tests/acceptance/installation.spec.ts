import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODE_IDS, SKINS } from '../../src/core/rules.ts';
import type { ProgressData } from '../../src/core/types.ts';
import { buildVersion, removeBuilds, startSite } from './support/site.ts';
import type { TestSite } from './support/site.ts';
import {
  SEED_DATE,
  launchProfile,
  newProfileDirectory,
  progressWith,
  readProgress,
  removeProfileDirectories,
  seedStorage,
} from './support/sauvegarde.ts';
import { watchProblems } from './support/jeu.ts';
import { chooseFile, downloadOnly } from './support/fichiers.ts';

const SLOW = 30_000;
const READY = 'Prêt à jouer hors ligne';
const UPDATED =
  'Serpent Cosmique a été mis à jour en version 1.1.0. Votre progression est conservée.';
const E06 =
  "La mise à jour n'a pas pu être installée. Votre version actuelle reste disponible. Réessayez avec une connexion. (E-06)";

let site: TestSite | null = null;
const contexts: BrowserContext[] = [];

test.afterEach(async () => {
  for (const context of contexts.splice(0)) await context.close().catch(() => undefined);
  await site?.close();
  site = null;
  removeBuilds();
  removeProfileDirectories();
});

async function publish(version: string, prefix = '/'): Promise<TestSite> {
  site = await startSite(buildVersion(version), prefix);
  return site;
}

/** Ouvre (ou rouvre) le jeu publié dans un profil de navigateur : l'agent de service et ses caches y survivent. */
async function launch(directory: string, address: TestSite, prefix = '/'): Promise<Page> {
  const context = await launchProfile(directory, `${address.origin}${prefix}`);
  contexts.push(context);
  const page = await context.newPage();
  await page.goto('./');
  return page;
}

async function relaunch(page: Page, directory: string, address: TestSite): Promise<Page> {
  await page.context().close();
  return launch(directory, address);
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Réglages' }).tap();
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
}

async function openAbout(page: Page): Promise<void> {
  await openSettings(page);
  await page.getByRole('button', { name: 'À propos' }).tap();
  await expect(page.getByRole('heading', { name: 'À propos', level: 1 })).toBeVisible();
}

async function backToMenu(page: Page, levels: number): Promise<void> {
  for (let level = 0; level < levels; level += 1) {
    await page.getByRole('button', { name: '‹ Retour' }).tap();
  }
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
}

/** Attend l'état « Prêt à jouer hors ligne » dans « À propos » (le mode hors ligne est alors installé). */
async function waitUntilReady(page: Page): Promise<void> {
  await openAbout(page);
  await expect(aboutText(page, READY)).toBeVisible({ timeout: SLOW });
  await backToMenu(page, 2);
}

const aboutText = (page: Page, text: string | RegExp) =>
  page.locator('main').getByText(text).first();

function fullProgress(): ProgressData {
  return progressWith((progress) => {
    for (const mode of MODE_IDS) {
      progress.records[mode] = Array.from({ length: 10 }, (_, index) => ({
        name: `Joueur ${index + 1}`,
        score: 9000 - index * 100,
        dateTime: SEED_DATE,
      }));
    }
    progress.lastName = 'Coco';
    progress.skins.unlocked = SKINS.map((skin) => skin.id);
    progress.counters.totalCandies = 1_000_000_000;
    for (const mode of MODE_IDS) progress.counters.gamesByMode[mode] = 1_000_000_000;
    progress.settings = { control: 'arrows', sounds: false, music: false, vibrations: true };
  });
}

async function cacheNames(page: Page): Promise<string[]> {
  return (await page.evaluate(() => caches.keys())).sort();
}

interface SlowPhone {
  toasts: string[];
  registered: boolean;
}

/**
 * Téléphone lent, pour les chargements suivants du profil : l'enregistrement de l'agent de service ne répond qu'une
 * fois le menu affiché, et les messages passagers de la page sont notés.
 */
async function slowRegistration(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const state = window as unknown as SlowPhone;
    state.toasts = [];
    state.registered = false;
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && node.classList.contains('toast')) {
            state.toasts.push(node.textContent ?? '');
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
    const container = navigator.serviceWorker;
    const register = container.register.bind(container);
    container.register = (...args) => {
      const answer = register(...args);
      return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
        const timer = window.setInterval(() => {
          if (document.querySelector('.menu') === null) return;
          window.clearInterval(timer);
          answer.then(resolve, reject);
          // Le jeu a traité la réponse quand cette tâche s'exécute.
          void answer.finally(() => window.setTimeout(() => (state.registered = true), 0));
        }, 20);
      });
    };
  });
}

/** Messages passagers affichés depuis le chargement, une fois la réponse de l'enregistrement traitée. */
async function toastsAfterRegistration(page: Page): Promise<string[]> {
  await expect
    .poll(() => page.evaluate(() => (window as unknown as SlowPhone).registered), {
      timeout: SLOW,
    })
    .toBe(true);
  return page.evaluate(() => (window as unknown as SlowPhone).toasts);
}

for (const prefix of ['/', '/serpent-cosmique/']) {
  test(`ct_64_installation_pwa : manifeste, cache vérifié et « ${READY} » (publié sous ${prefix})`, async () => {
    const address = await publish('1.0.0', prefix);
    const directory = newProfileDirectory();
    const page = await launch(directory, address, prefix);
    const problems = watchProblems(page);
    // Au premier chargement, le menu annonce que le jeu est prêt ; le message ne suit pas dans les autres écrans.
    await expect(page.locator('.toast')).toHaveText(READY, { timeout: SLOW });
    await openSettings(page);
    await expect(page.locator('.toast')).toHaveCount(0);
    await backToMenu(page, 1);
    await waitUntilReady(page);
    const base = `${address.origin}${prefix}`;

    // Manifeste : identité relative, plein écran paysage, trois icônes aux bonnes tailles.
    const manifest = (await (await page.request.get(`${base}manifest.webmanifest`)).json()) as {
      id: string;
      start_url: string;
      scope: string;
      display: string;
      orientation: string;
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect([manifest.id, manifest.start_url, manifest.scope]).toEqual(['./', './', './']);
    expect([manifest.display, manifest.orientation]).toEqual(['fullscreen', 'landscape']);
    expect(manifest.icons.map((icon) => `${icon.sizes}${icon.purpose ?? ''}`)).toEqual([
      '192x192',
      '512x512',
      '512x512maskable',
    ]);
    for (const icon of manifest.icons) {
      const png = await (await page.request.get(`${base}${icon.src}`)).body();
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }

    // Cache : seulement des fichiers du site, en chemins relatifs, dont l'empreinte est celle de sw.js.
    const worker = await (await page.request.get(`${base}sw.js`)).text();
    const listed = new Map(
      (/^const FILES = (".*");$/m.exec(worker)?.[1] ?? '""')
        .replace(/^"|"$/g, '')
        .split('\\n')
        .map((line) => line.split(' ') as [string, string]),
    );
    const cached = await page.evaluate(async () => {
      const cache = await caches.open('serpent-cosmique-1.0.0');
      const result: [string, string][] = [];
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        const hash = new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            (await response?.arrayBuffer()) ?? new ArrayBuffer(0),
          ),
        );
        result.push([request.url, btoa(String.fromCharCode(...hash)).replace(/=+$/, '')]);
      }
      return result;
    });
    expect(cached.length).toBe(listed.size);
    for (const [url, digest] of cached) {
      expect(url.startsWith(base)).toBe(true);
      expect(listed.get(url.slice(base.length))).toBe(digest);
    }
    expect(await cacheNames(page)).toEqual(['serpent-cosmique-1.0.0']);

    // Poids : très inférieur à 50 Mo (ENF-02).
    const size = (directory: string): number =>
      readdirSync(directory, { withFileTypes: true }).reduce(
        (sum, entry) =>
          sum +
          (entry.isDirectory()
            ? size(join(directory, entry.name))
            : statSync(join(directory, entry.name)).size),
        0,
      );
    expect(size('dist')).toBeLessThan(5_000_000);
    const usage = await page.evaluate(async () => (await navigator.storage.estimate()).usage ?? 0);
    expect(usage).toBeLessThan(50_000_000);
    expect(problems).toEqual([]);
  });
}

test('ct_64_installation_pwa : sans agent de service (contexte non sécurisé), le jeu reste jouable et dit que le hors ligne manque', async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { serviceWorker?: unknown }).serviceWorker;
  });
  const problems = watchProblems(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await expect(page.getByRole('button', { name: 'Classique' })).toBeVisible();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await openAbout(page);
  await expect(
    aboutText(page, 'Hors ligne non disponible : ouvrez le jeu une fois avec une connexion.'),
  ).toBeVisible();
  expect(problems).toEqual([]);
});

test('ct_64_installation_pwa : le manifeste est reconnu installable (Chromium) et ne déclare aucune entrée en plus', async ({
  browserName,
}) => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  const page = await launch(directory, address);
  await waitUntilReady(page);
  if (browserName === 'chromium') {
    const client = await page.context().newCDPSession(page);
    const result = (await client.send('Page.getInstallabilityErrors')) as {
      installabilityErrors: { errorId: string }[];
    };
    expect(result.installabilityErrors).toEqual([]);
  }
  const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8')) as Record<
    string,
    unknown
  >;
  for (const field of ['share_target', 'file_handlers', 'protocol_handlers', 'launch_handler']) {
    expect(manifest[field]).toBeUndefined();
  }
});

test(`ct_64_installation_pwa : à une ouverture ordinaire, aucun message passager « ${READY} »`, async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  page = await relaunch(page, directory, address);
  await slowRegistration(page.context());
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  expect(await toastsAfterRegistration(page)).toEqual([]);
  await openAbout(page);
  await expect(aboutText(page, READY)).toBeVisible();
});

test('ct_65_hors_ligne_apres_redemarrage : serveur arrêté, navigateur relancé, une partie, un réglage et une fin de partie, 0 requête', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);

  address.setOffline(true);
  const before = address.exchanges.length;
  page = await relaunch(page, directory, address);
  await page.context().setOffline(true);
  const problems = watchProblems(page);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith(address.origin)) requests.push(request.url());
  });
  await page.goto('./?seed=1');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible({ timeout: SLOW });

  await openSettings(page);
  await page.getByRole('radio', { name: 'Flèches' }).tap();
  await expect.poll(async () => (await readProgress(page))?.settings.control).toBe('arrows');
  await backToMenu(page, 1);

  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await expect(page.locator('.end')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.end-reason')).toHaveText('Collision');
  await expect.poll(async () => (await readProgress(page))?.counters.gamesByMode.classic).toBe(1);

  expect(requests).toEqual([]);
  expect(address.exchanges.slice(before).filter((exchange) => exchange.status !== 0)).toEqual([]);
  expect(problems).toEqual([]);
});

test('ct_66_mise_a_jour_consentie : la version 1.1.0 n’est appliquée qu’au toucher de « Installer », la progression est identique', async () => {
  const address = await publish('1.0.0');
  const v110 = buildVersion('1.1.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await seedStorage(page, { progress: fullProgress() });
  await page.goto('./');
  await waitUntilReady(page);
  await openAbout(page);
  // État A : rien de nouveau connu.
  await expect(aboutText(page, 'Vous avez la dernière version connue.')).toBeVisible();
  await expect(aboutText(page, 'Version 1.0.0')).toBeVisible();
  // Ni conseil ni lien de sauvegarde tant qu'aucune version n'est proposée.
  await expect(page.getByRole('button', { name: 'Créer une sauvegarde' })).toHaveCount(0);
  const before = await readProgress(page);
  expect(before).toEqual(fullProgress());

  address.serve(v110);
  // Deux fermetures complètes puis réouvertures sans toucher « Installer » : la version reste 1.0.0 (CA-1).
  for (let opening = 0; opening < 2; opening += 1) {
    const mark = address.exchanges.length;
    page = await relaunch(page, directory, address);
    await openAbout(page);
    await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible({
      timeout: SLOW,
    });
    await expect(aboutText(page, 'Version 1.0.0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Installer', exact: true })).toBeVisible();
    await expect(aboutText(page, 'Votre progression est conservée.')).toBeVisible();
    await expect(aboutText(page, "Conseil : créez d'abord une sauvegarde.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer une sauvegarde' })).toBeVisible();
    // ENF-09 : l'échange d'une ouverture connectée, version changée ou non, tient en 10 Ko.
    const bytes = address.exchanges.slice(mark).reduce((sum, exchange) => sum + exchange.bytes, 0);
    expect(bytes).toBeLessThanOrEqual(10_000);
    expect(await cacheNames(page)).toEqual(['serpent-cosmique-1.0.0', 'serpent-cosmique-offer']);
  }
  // Le lien « Créer une sauvegarde » ouvre E11 ; « ‹ Retour » ramène à « À propos ».
  await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
  await expect(page.getByRole('heading', { name: 'Sauvegarde', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('heading', { name: 'À propos', level: 1 })).toBeVisible();
  // Repère « Mise à jour » sur « Réglages », au menu et dans les réglages.
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'À propos Mise à jour' })).toBeVisible();
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'Réglages Mise à jour' })).toBeVisible();

  // CA-2 : « Installer » télécharge, vérifie, remplace, recharge et annonce.
  await page.getByRole('button', { name: 'Réglages' }).tap();
  await page.getByRole('button', { name: 'À propos' }).tap();
  await slowRegistration(page.context());
  await page.getByRole('button', { name: 'Installer', exact: true }).tap();
  await expect(page.locator('.toast').getByText(UPDATED)).toBeVisible({ timeout: SLOW });
  await expect(page.getByRole('button', { name: 'Réglages', exact: true })).toBeVisible();
  // Le message de RG-90 n'est remplacé par aucun autre, même si l'agent répond après l'affichage du menu.
  expect(await toastsAfterRegistration(page)).toEqual([UPDATED]);
  await expect(page.locator('.toast')).toHaveText(UPDATED);
  await openAbout(page);
  await expect(aboutText(page, 'Version 1.1.0')).toBeVisible();
  await expect(aboutText(page, READY)).toBeVisible();
  await expect(aboutText(page, 'Vous avez la dernière version connue.')).toBeVisible();
  expect(await readProgress(page)).toEqual(before);
  expect(await cacheNames(page)).toEqual(['serpent-cosmique-1.1.0']);
  expect(readFileSync(join(v110, 'manifest.webmanifest'))).toEqual(
    readFileSync('dist/manifest.webmanifest'),
  );

  // La nouvelle version fonctionne sans réseau, avec la même progression.
  address.setOffline(true);
  await page.context().setOffline(true);
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await openAbout(page);
  await expect(aboutText(page, 'Version 1.1.0')).toBeVisible();
  expect(await readProgress(page)).toEqual(before);
});

test.describe('ct_67_mise_a_jour_echec : la version en place reste utilisable, hors ligne comprise (EF-29 CA-3)', () => {
  /** Version 1.0.0 installée avec sa progression, version 1.1.0 proposée, « Installer » touché. */
  async function startFailingUpdate(
    address: TestSite,
    directory: string,
    next: string,
  ): Promise<Page> {
    let page = await launch(directory, address);
    await seedStorage(page, { progress: fullProgress() });
    await page.goto('./');
    await waitUntilReady(page);
    address.serve(next);
    page = await relaunch(page, directory, address);
    await openAbout(page);
    await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible({
      timeout: SLOW,
    });
    return page;
  }

  async function expectStillUsable(page: Page, address: TestSite): Promise<void> {
    await expect(aboutText(page, E06)).toBeVisible({ timeout: SLOW });
    // Erreur : icône + texte + code (05 § 6) ; l'icône est masquée aux lecteurs d'écran.
    const icon = page.locator('.about-error .toast-icon');
    await expect(icon).toHaveText('!');
    await expect(icon).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('alert')).toContainText(E06);
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible();
    await expect(aboutText(page, 'Version 1.0.0')).toBeVisible();
    // Aucun fichier de la nouvelle version, aucun consentement résiduel.
    expect(await cacheNames(page)).toEqual(['serpent-cosmique-1.0.0', 'serpent-cosmique-offer']);
    address.setOffline(true);
    await page.context().setOffline(true);
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await openAbout(page);
    await expect(aboutText(page, 'Version 1.0.0')).toBeVisible();
    expect(await readProgress(page)).toEqual(fullProgress());
  }

  test('un fichier dont l’empreinte est fausse donne E-06 et rien n’est mis en cache', async () => {
    const address = await publish('1.0.0');
    const directory = newProfileDirectory();
    const page = await startFailingUpdate(
      address,
      directory,
      buildVersion('1.1.0', { tamper: 'ui/texts.js' }),
    );
    await page.getByRole('button', { name: 'Installer', exact: true }).tap();
    await expectStillUsable(page, address);
  });

  test('une connexion coupée en cours de téléchargement donne E-06 ; « Réessayer » aboutit une fois la connexion revenue', async () => {
    const address = await publish('1.0.0');
    const directory = newProfileDirectory();
    const page = await startFailingUpdate(address, directory, buildVersion('1.1.0'));
    address.cutOn('/ui/texts.js');
    await page.getByRole('button', { name: 'Installer', exact: true }).tap();
    await expect(aboutText(page, E06)).toBeVisible({ timeout: SLOW });
    expect(await cacheNames(page)).toEqual(['serpent-cosmique-1.0.0', 'serpent-cosmique-offer']);

    address.cutOn(null);
    await page.getByRole('button', { name: 'Réessayer' }).tap();
    await expect(page.locator('.toast').getByText(UPDATED)).toBeVisible({ timeout: SLOW });
    await openAbout(page);
    await expect(aboutText(page, 'Version 1.1.0')).toBeVisible();
  });

  test('une connexion coupée, puis le réseau perdu : la version 1.0.0 fonctionne en mode avion avec sa progression', async () => {
    const address = await publish('1.0.0');
    const directory = newProfileDirectory();
    const page = await startFailingUpdate(address, directory, buildVersion('1.1.0'));
    address.cutOn('/ui/texts.js');
    await page.getByRole('button', { name: 'Installer', exact: true }).tap();
    await expectStillUsable(page, address);
  });
});

test('ct_104_mise_a_jour_contexte : rien pendant une partie ni en pause, la proposition au menu seulement', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  const page = await launch(directory, address);
  await waitUntilReady(page);
  address.serve(buildVersion('1.1.0'));

  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await expect(page.locator('canvas')).toBeVisible();
  // La nouvelle version est détectée pendant la partie.
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())?.update().catch(() => undefined);
  });
  await expect.poll(() => cacheNames(page), { timeout: SLOW }).toContain('serpent-cosmique-offer');
  const proposal = page.getByText(/Nouvelle version|Mise à jour|Installer/);
  await expect(proposal).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Reprendre' })).toBeVisible();
  await expect(proposal).toHaveCount(0);
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end')).toBeVisible();
  await expect(proposal).toHaveCount(0);

  // Au menu : le repère, puis la proposition dans « À propos ».
  await page.getByRole('button', { name: 'Menu' }).tap();
  await expect(page.getByRole('button', { name: 'Réglages Mise à jour' })).toBeVisible();
  await openAbout(page);
  await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible();
});

test('ct_104_mise_a_jour_contexte : en mode avion, ni proposition ni erreur, et « Prêt à jouer hors ligne » est visible (EF-29 CA-5)', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  address.setOffline(true);
  const mark = address.exchanges.length;
  page = await relaunch(page, directory, address);
  await page.context().setOffline(true);
  const problems = watchProblems(page);
  await page.goto('./');
  await openAbout(page);
  await expect(aboutText(page, READY)).toBeVisible();
  await expect(page.getByText(/Nouvelle version/)).toHaveCount(0);
  await expect(page.getByText(/E-06|n'a pas pu/)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByText('Version 1.0.0')).toBeVisible();
  await expect(page.getByText('© CocoClaudo')).toBeVisible();
  expect(address.exchanges.slice(mark).filter((exchange) => exchange.status !== 0)).toEqual([]);
  expect(problems).toEqual([]);
});

test('ct_104_mise_a_jour_contexte : une proposition vue connecté ne s’affiche plus en mode avion, ni au menu ni dans « À propos », et revient avec la connexion (EF-29 CA-5, RG-89)', async () => {
  test.setTimeout(60_000);
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  address.serve(buildVersion('1.1.0'));
  page = await relaunch(page, directory, address);
  await openAbout(page);
  await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible({
    timeout: SLOW,
  });
  expect(await cacheNames(page)).toContain('serpent-cosmique-offer');

  // Mode avion : la proposition est toujours mémorisée, mais n'est plus présentée.
  address.setOffline(true);
  page = await relaunch(page, directory, address);
  await page.context().setOffline(true);
  const problems = watchProblems(page);
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réglages Mise à jour' })).toHaveCount(0);
  await openSettings(page);
  await expect(page.getByRole('button', { name: 'À propos Mise à jour' })).toHaveCount(0);
  await page.getByRole('button', { name: 'À propos' }).tap();
  await expect(aboutText(page, READY)).toBeVisible();
  await expect(page.getByText(/Nouvelle version/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Installer', exact: true })).toHaveCount(0);
  await expect(page.getByText(/E-06/)).toHaveCount(0);
  await expect(aboutText(page, 'Version 1.0.0')).toBeVisible();
  expect(problems).toEqual([]);

  // La connexion revient : la proposition réapparaît sans rouvrir le jeu.
  address.setOffline(false);
  await page.context().setOffline(false);
  await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible();
});

test('ct_104_mise_a_jour_contexte : une version qui n’est plus publiée n’est plus proposée', async () => {
  test.setTimeout(60_000);
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  address.serve(buildVersion('1.1.0'));
  page = await relaunch(page, directory, address);
  await openAbout(page);
  await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible({
    timeout: SLOW,
  });

  address.serve(buildVersion('1.0.0'));
  page = await relaunch(page, directory, address);
  await openAbout(page);
  await expect(aboutText(page, 'Vous avez la dernière version connue.')).toBeVisible({
    timeout: SLOW,
  });
  await expect(page.getByText(/Nouvelle version/)).toHaveCount(0);
  // La proposition périmée est aussi effacée de Cache Storage : elle ne reparaît pas à l'ouverture suivante.
  await expect.poll(() => cacheNames(page)).toEqual(['serpent-cosmique-1.0.0']);
});

test('ct_67_mise_a_jour_echec : une version plus récente publiée après la proposition est proposée à son tour, sans E-06 (EF-29)', async () => {
  test.setTimeout(60_000);
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await seedStorage(page, { progress: fullProgress() });
  await page.goto('./');
  await waitUntilReady(page);
  address.serve(buildVersion('1.1.0'));
  page = await relaunch(page, directory, address);
  await openAbout(page);
  await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible({
    timeout: SLOW,
  });

  address.serve(buildVersion('1.2.0'));
  await page.getByRole('button', { name: 'Installer', exact: true }).tap();
  await expect(aboutText(page, 'Nouvelle version 1.2.0 disponible.')).toBeVisible({
    timeout: SLOW,
  });
  await expect(page.getByText(/E-06/)).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(aboutText(page, 'Version 1.0.0')).toBeVisible();

  await page.getByRole('button', { name: 'Installer', exact: true }).tap();
  await expect(page.locator('.toast').getByText(UPDATED.replace('1.1.0', '1.2.0'))).toBeVisible({
    timeout: SLOW,
  });
  await openAbout(page);
  await expect(aboutText(page, 'Version 1.2.0')).toBeVisible();
  expect(await readProgress(page)).toEqual(fullProgress());
});

test('ct_104_mise_a_jour_contexte : ouverture connectée sans nouvelle version, 10 Ko au plus (ENF-09)', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  for (let opening = 0; opening < 2; opening += 1) {
    const mark = address.exchanges.length;
    page = await relaunch(page, directory, address);
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await openAbout(page);
    await expect(aboutText(page, READY)).toBeVisible();
    const bytes = address.exchanges.slice(mark).reduce((sum, exchange) => sum + exchange.bytes, 0);
    expect(bytes).toBeLessThanOrEqual(10_000);
  }
});

test('ENF-05 : démarrage à froid depuis le cache, hors ligne, en moins de 3 s', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  address.setOffline(true);
  page = await relaunch(page, directory, address);
  await page.context().setOffline(true);
  const start = Date.now();
  await page.goto('./');
  await page.getByRole('button', { name: 'Jouer' }).waitFor();
  expect(Date.now() - start).toBeLessThan(3000);
});

const ANDROID_AGENT =
  'Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPHONE_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

async function seriousViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) => `${violation.id} : ${violation.nodes.map((node) => node.target).join(' ')}`,
    );
}

async function openInstallPanel(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByText('Pour jouer hors ligne, installez le jeu.')).toBeVisible();
  await page.getByRole('button', { name: 'Installer le jeu' }).tap();
  await expect(page.getByRole('heading', { name: 'Installer le jeu', level: 1 })).toBeVisible();
}

test.describe('ct_105_panneau_installation : Android', () => {
  test.use({ userAgent: ANDROID_AGENT });

  test('bandeau, trois étapes sans invite, bouton avec l’invite du navigateur, message après installation', async ({
    page,
  }) => {
    const problems = watchProblems(page);
    await openInstallPanel(page);
    const steps = page.getByRole('listitem');
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText('Touchez ⋮ en haut à droite du navigateur.');
    await expect(steps.nth(1)).toContainText("Touchez « Installer l'application ».");
    await expect(steps.nth(2)).toContainText(READY);
    await expect(page.getByText('Sur iPhone')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Installer le jeu' })).toHaveCount(0);

    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      (event as unknown as { prompt: () => Promise<void> }).prompt = () => {
        (window as unknown as { __prompted: number }).__prompted = 1;
        return Promise.resolve();
      };
      window.dispatchEvent(event);
    });
    await page.getByRole('button', { name: 'Installer le jeu' }).tap();
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __prompted?: number }).__prompted))
      .toBe(1);

    await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await expect(
      page
        .locator('#app')
        .getByText("Jeu installé. Ouvrez-le depuis son icône sur l'écran d'accueil."),
    ).toBeVisible();
    await page.getByRole('button', { name: '‹ Retour' }).tap();
    await expect(page.getByText('Pour jouer hors ligne, installez le jeu.')).toBeHidden();
    expect(problems).toEqual([]);
  });

  test('« Autre téléphone » ajoute les étapes de l’iPhone', async ({ page }) => {
    await openInstallPanel(page);
    await page.getByRole('button', { name: 'Autre téléphone' }).tap();
    await expect(page.getByRole('heading', { name: 'Sur iPhone' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(6);
  });

  test('E14 et E1 (bandeau d’installation) sans violation d’accessibilité sérieuse', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Pour jouer hors ligne, installez le jeu.')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: 'Installer le jeu' }).tap();
    await expect(page.getByRole('heading', { name: 'Installer le jeu', level: 1 })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });
});

test.describe('ct_105_panneau_installation : iPhone', () => {
  test.use({ userAgent: IPHONE_AGENT });

  test('trois étapes de Safari, conseil de la verticale, rappel du premier lancement connecté, lien « Autre téléphone »', async ({
    page,
  }) => {
    await openInstallPanel(page);
    const steps = page.getByRole('listitem');
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText('Touchez Partager');
    await expect(steps.nth(0)).toContainText('Tenez un instant le téléphone à la verticale.');
    await expect(steps.nth(1)).toContainText("Touchez « Sur l'écran d'accueil ».");
    await expect(steps.nth(2)).toContainText('Touchez « Ajouter »');
    await expect(
      page.getByText('Ce premier lancement avec une connexion est indispensable'),
    ).toBeVisible();
    await expect(page.getByText('Sur Android')).toHaveCount(0);
    await page.getByRole('button', { name: 'Autre téléphone' }).tap();
    await expect(page.getByRole('heading', { name: 'Sur Android' })).toBeVisible();
    await expect(page.getByRole('listitem')).toHaveCount(6);
  });
});

test('ct_109_roles_et_etats : E1 (repère de mise à jour), E10 À propos avec et sans proposition, sans violation sérieuse', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  let page = await launch(directory, address);
  await waitUntilReady(page);
  await openAbout(page);
  await expect(aboutText(page, 'Vous avez la dernière version connue.')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);

  address.serve(buildVersion('1.1.0'));
  page = await relaunch(page, directory, address);
  await openAbout(page);
  await expect(aboutText(page, 'Nouvelle version 1.1.0 disponible.')).toBeVisible({
    timeout: SLOW,
  });
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  expect(await seriousViolations(page)).toEqual([]);
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('button', { name: 'Réglages Mise à jour' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
});

const BUTTON_TO_ERASE = /effac|supprim|réinitialis|vider|\breset\b|\bdelete\b|\bclear\b/i;

test('ct_68_effacement_des_donnees : le jeu n’offre aucun effacement ; après effacement des données du site il repart comme au premier lancement, le fichier de sauvegarde reste intact', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  const context = await launchProfile(directory, `${address.origin}/`);
  contexts.push(context);
  const page = await context.newPage();
  const problems = watchProblems(page);
  await downloadOnly(page);
  await seedStorage(page, { progress: fullProgress() });
  await page.goto('./');
  await waitUntilReady(page);
  expect((await readProgress(page))?.counters.totalCandies).toBe(1_000_000_000);

  // 1. Aucune action de réinitialisation ni de suppression dans les menus, les réglages et la sauvegarde.
  const labels: string[] = [];
  for (const screen of ['Records', 'Skins', 'Réglages', 'Sauvegarde']) {
    await page.getByRole('button', { name: screen, exact: true }).tap();
    await expect(page.getByRole('heading', { name: screen, level: 1 })).toBeAttached();
    if (screen === 'Réglages') {
      await page.getByRole('button', { name: 'À propos' }).tap();
      labels.push(...(await page.getByRole('button').allTextContents()));
      await page.getByRole('button', { name: '‹ Retour' }).tap();
    }
    labels.push(
      ...(await page.getByRole('button').allTextContents()),
      ...(await page.getByRole('switch').allTextContents()),
      ...(await page.getByRole('radio').allTextContents()),
    );
    await page.getByRole('button', { name: '‹ Retour' }).tap();
  }
  expect(labels.length).toBeGreaterThan(15);
  expect(labels.filter((label) => BUTTON_TO_ERASE.test(label))).toEqual([]);

  // 2. Une sauvegarde par fichier, conservée hors du navigateur.
  await page.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
  const folder = mkdtempSync(join(tmpdir(), 'serpent-sauvegarde-'));
  try {
    const file = join(folder, 'sauvegarde.json');
    await (await download).saveAs(file);
    const before = createHash('sha256').update(readFileSync(file)).digest('hex');

    // 3. Équivalent de la procédure du guide : désinscrire l'agent de service, effacer les données du site.
    await page.evaluate(async () => {
      for (const registration of await navigator.serviceWorker.getRegistrations()) {
        await registration.unregister();
      }
    });
    const client = await context.newCDPSession(page);
    await client.send('Storage.clearDataForOrigin', {
      origin: address.origin,
      storageTypes: 'all',
    });
    await page.goto('./');
    await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(await readProgress(page)).toBeNull();
    expect(await page.evaluate(async () => (await caches.keys()).length)).toBe(0);

    // Premier lancement : réglages par défaut, aucun record.
    await openSettings(page);
    await expect(page.getByRole('radio', { name: 'Glissement' })).toBeChecked();
    for (const name of ['Bruitages', 'Musique', 'Vibrations']) {
      await expect(page.getByRole('switch', { name })).toBeChecked();
    }
    await backToMenu(page, 1);
    await page.getByRole('button', { name: 'Records', exact: true }).tap();
    await expect(page.getByText("Aucun record pour l'instant")).toBeVisible();
    await backToMenu(page, 1);

    // Le fichier de sauvegarde n'a été ni supprimé ni modifié ; il rend la progression.
    expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(before);
    await page.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
    await chooseFile(page, { bytes: readFileSync(file) });
    await page.getByRole('button', { name: 'Fusionner' }).tap();
    await expect.poll(async () => (await readProgress(page))?.records.classic.length ?? 0).toBe(10);
    expect((await readProgress(page))?.lastName).toBe('Coco');
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }

  // 4. La procédure d'effacement est décrite pour Android et pour iPhone.
  const guide = readFileSync('docs/guide-installation.md', 'utf8');
  expect(guide).toMatch(/Paramètres des sites/);
  expect(guide).toMatch(/Supprimer l'app/);
  expect(problems).toEqual([]);
});

test('ct_70_aucun_reseau : après l’installation, ni la partie, ni la sauvegarde, ni la restauration, ni un réglage n’émettent de requête ; les tentatives de la page sont bloquées', async () => {
  const address = await publish('1.0.0');
  const directory = newProfileDirectory();
  const context = await launchProfile(directory, `${address.origin}/`);
  contexts.push(context);
  const requested: string[] = [];
  const foreign: string[] = [];
  context.on('request', (request) => requested.push(request.url()));
  await context.route(
    (url) => url.hostname !== '127.0.0.1',
    (route) => {
      foreign.push(route.request().url());
      return route.abort();
    },
  );
  const page = await context.newPage();
  const problems = watchProblems(page);
  await downloadOnly(page);
  await page.goto('./?seed=1');
  await waitUntilReady(page);
  const installedRequests = requested.length;
  const installedExchanges = address.exchanges.length;
  expect(installedRequests).toBeGreaterThan(0);

  // Une partie jusqu'à son abandon, un réglage, une sauvegarde créée puis restaurée.
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: 'Classique' }).tap();
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end')).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).tap();
  await openSettings(page);
  await page.getByRole('switch', { name: 'Musique' }).tap();
  await backToMenu(page, 1);
  await page.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
  const created = readFileSync((await (await download).path()) ?? '');
  await chooseFile(page, { bytes: created });
  await page.getByRole('button', { name: 'Fusionner' }).tap();
  await expect(page.getByText(/Restauration terminée/).first()).toBeVisible();

  // Tentatives depuis la page : la politique de sécurité du contenu les bloque (connect-src).
  const outcome = await page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      violations.push(event.violatedDirective),
    );
    const attempts = await Promise.all([
      fetch('https://exemple.invalid/a').then(
        () => 'envoyée',
        () => 'bloquée',
      ),
      new Promise<string>((resolve) => {
        const request = new XMLHttpRequest();
        request.open('GET', 'https://exemple.invalid/b');
        request.onload = () => resolve('envoyée');
        request.onerror = () => resolve('bloquée');
        request.send();
      }),
      new Promise<string>((resolve) => {
        try {
          const socket = new WebSocket('wss://exemple.invalid/c');
          socket.onopen = () => resolve('envoyée');
          socket.onerror = () => resolve('bloquée');
        } catch {
          resolve('bloquée');
        }
      }),
      Promise.resolve(navigator.sendBeacon('https://exemple.invalid/d', 'x')).then(() => 'tentée'),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { attempts, violations };
  });
  expect(outcome.attempts.slice(0, 3)).toEqual(['bloquée', 'bloquée', 'bloquée']);
  expect(outcome.violations.length).toBeGreaterThanOrEqual(4);
  expect(new Set(outcome.violations)).toEqual(new Set(['connect-src']));

  // Rien n'est sorti du poste : aucune requête vers l'extérieur n'est arrivée jusqu'au réseau (l'interception
  // l'aurait vue), le navigateur ne note, à part les tentatives du test, aucune adresse extérieure, et le
  // serveur n'a reçu aucune requête depuis la fin de l'installation.
  const attempted = ['a', 'b', 'c', 'd'].map((name) => `https://exemple.invalid/${name}`);
  expect(foreign).toEqual([]);
  expect(
    requested
      .slice(installedRequests)
      .filter((url) => !url.startsWith(address.origin) && !attempted.includes(url)),
  ).toEqual([]);
  expect(address.exchanges.length).toBe(installedExchanges);

  expect(
    problems.filter((problem) => !/exemple\.invalid|Content Security Policy|CSP/.test(problem)),
  ).toEqual([]);

  // Une ressource absente du pré-cache : réponse d'erreur de l'agent de service, sans accès au réseau.
  const response = await page.goto(`${address.origin}/absente.png`);
  expect(response?.status()).toBe(404);
  expect(address.exchanges.some((exchange) => exchange.path === '/absente.png')).toBe(false);
  expect(foreign).toEqual([]);
});

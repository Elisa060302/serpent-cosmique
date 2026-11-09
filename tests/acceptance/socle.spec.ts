import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// Dans le navigateur (jeu non installé), le bandeau d'installation de E1 ajoute « Installer le jeu » (05 § 4.1).
const MENU_LABELS = ['Jouer', 'Installer le jeu', 'Records', 'Skins', 'Réglages', 'Sauvegarde'];

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; " +
  "media-src 'self' blob:; font-src 'self'; connect-src 'none'; worker-src 'self'; " +
  "manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'";

interface Watch {
  pageErrors: string[];
  dialogs: string[];
  requests: string[];
}

function watch(page: Page): Watch {
  const watched: Watch = { pageErrors: [], dialogs: [], requests: [] };
  page.on('pageerror', (error) => watched.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') watched.pageErrors.push(message.text());
  });
  page.on('dialog', (dialog) => {
    watched.dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  page.on('request', (request) => watched.requests.push(request.url()));
  return watched;
}

async function recordPolicyViolations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const violations: string[] = [];
    Object.defineProperty(window, '__violations', { value: violations });
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
}

async function violations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __violations: string[] }).__violations);
}

test('ct_01_menu_principal_en_paysage : les cinq boutons sont visibles sans défiler', async ({
  page,
}) => {
  const watched = watch(page);
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Serpent Cosmique');

  const buttons = page.getByRole('button');
  await expect(buttons).toHaveText(MENU_LABELS);

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  expect(viewport!.width).toBeGreaterThan(viewport!.height);
  const sizes: { width: number; height: number }[] = [];
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
    // Zone tactile d'au moins 9 mm (57 px CSS à 6,3 px par mm).
    expect(box!.width).toBeGreaterThanOrEqual(57);
    expect(box!.height).toBeGreaterThanOrEqual(57);
    sizes.push(box!);
  }
  const [play, ...others] = sizes;
  for (const other of others) {
    expect(play!.height).toBeGreaterThan(other.height);
  }
  expect(watched.pageErrors).toEqual([]);
});

test('ct_01_menu_principal_en_paysage : le titre n’est pas en majuscules continues', async ({
  page,
}) => {
  await page.goto('/');
  const title = page.getByRole('heading', { level: 1 });
  await expect(title).toHaveText('Serpent Cosmique');
  await expect(title).toHaveCSS('text-transform', 'none');
});

test('ct_01_menu_principal_en_paysage : zones sûres non nulles, la page ne défile pas', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  // Équivalent des zones sûres d'un iPhone en paysage (encoche, barre d'accueil).
  await page.evaluate(() => {
    const app = document.getElementById('app');
    if (app !== null) app.style.padding = '0px 44px 21px 44px';
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('ct_72_politique_de_securite : balise en tête, aucune violation, aucune requête après le chargement', async ({
  page,
}) => {
  const watched = watch(page);
  await recordPolicyViolations(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();

  const head = await page.evaluate(() => {
    const first = document.head.firstElementChild;
    return {
      tag: first?.tagName,
      httpEquiv: first?.getAttribute('http-equiv'),
      content: first?.getAttribute('content'),
      referrer: document.querySelector('meta[name="referrer"]')?.getAttribute('content'),
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content'),
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content'),
      inlineScripts: document.querySelectorAll('script:not([src])').length,
      inlineStyles: document.querySelectorAll('style, [style], [onclick], [onload]').length,
      cookie: document.cookie,
    };
  });
  expect(head.tag).toBe('META');
  expect(head.httpEquiv).toBe('Content-Security-Policy');
  expect(head.content).toBe(CSP);
  expect(head.referrer).toBe('no-referrer');
  expect(head.robots).toBe('noindex');
  expect(head.viewport).toContain('viewport-fit=cover');
  expect(head.inlineScripts).toBe(0);
  expect(head.inlineStyles).toBe(0);
  expect(head.cookie).toBe('');

  const origin = new URL(page.url()).origin;
  expect(watched.requests.filter((url) => !url.startsWith(`${origin}/`))).toEqual([]);

  const countAfterLoad = watched.requests.length;
  await page.waitForTimeout(1000);
  expect(watched.requests.length).toBe(countAfterLoad);
  expect(await violations(page)).toEqual([]);
  expect(watched.pageErrors).toEqual([]);
});

test('ct_72_politique_de_securite : un script en ligne et un script externe sont bloqués', async ({
  page,
}) => {
  await recordPolicyViolations(page);
  await page.goto('/');
  await page.evaluate(() => {
    const inline = document.createElement('script');
    inline.textContent = 'window.__injecte = true;';
    document.body.append(inline);
    const external = document.createElement('script');
    external.src = 'https://exemple.test/script.js';
    document.body.append(external);
  });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => 'injecte' in window || '__injecte' in window)).toBe(false);
  expect((await violations(page)).length).toBeGreaterThanOrEqual(2);
});

test('ct_72_politique_de_securite : le jeu refuse de démarrer dans un cadre', async ({
  page,
  baseURL,
}) => {
  await page.setContent(`<iframe src="${baseURL}/" width="600" height="300"></iframe>`);
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('body')).toContainText('cadre');
  await expect(frame.getByRole('button')).toHaveCount(0);
});

test('ct_119_parametre_seed : toute valeur ou tout autre paramètre est sans effet visible', async ({
  page,
}) => {
  const queries = [
    '?seed=42',
    '?seed=abc',
    '?seed=-1',
    '?seed=99999999999',
    '?seed=4294967296',
    `?seed=${encodeURIComponent('<img src=x onerror=alert(1)>')}`,
    '?seed=1&seed=2',
    '?autre=3',
    '#seed=5',
  ];
  for (const query of queries) {
    const watched = watch(page);
    await page.goto(`/${query}`);
    await expect(page.getByRole('button')).toHaveText(MENU_LABELS);
    const markup = await page.evaluate(() => document.documentElement.outerHTML);
    expect(markup).not.toContain('onerror');
    expect(markup).not.toContain('alert(1)');
    expect(watched.dialogs).toEqual([]);
    expect(watched.pageErrors).toEqual([]);
    page.removeAllListeners();
  }
});

test('ct_120_manifeste : aucun point d’entrée ajouté, icônes présentes', async ({
  page,
  request,
}) => {
  const manifest = (await (await request.get('/manifest.webmanifest')).json()) as Record<
    string,
    unknown
  >;
  for (const forbidden of [
    'share_target',
    'file_handlers',
    'protocol_handlers',
    'launch_handler',
  ]) {
    expect(manifest).not.toHaveProperty(forbidden);
  }
  expect(manifest['name']).toBe('Serpent Cosmique');
  expect(manifest['id']).toBe('./');
  expect(manifest['start_url']).toBe('./');
  expect(manifest['scope']).toBe('./');
  expect(manifest['display']).toBe('fullscreen');
  expect(manifest['orientation']).toBe('landscape');
  expect(manifest['lang']).toBe('fr');

  const icons = manifest['icons'] as {
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }[];
  expect(icons.map((icon) => icon.sizes).sort()).toEqual(['192x192', '512x512', '512x512']);
  expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of icons) {
    const response = await request.get(`/${icon.src}`);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
  }

  await page.goto('/');
  const touchIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect((await request.get(`/${touchIcon}`)).status()).toBe(200);
  expect(await request.get('/robots.txt').then((response) => response.text())).toContain(
    'Disallow: /',
  );
});

test('ct_117_analyse_axe : E1 Menu principal sans violation sérieuse ou critique', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(blocking.map((violation) => violation.id)).toEqual([]);
});

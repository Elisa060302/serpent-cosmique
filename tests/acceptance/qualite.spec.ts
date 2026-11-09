import { expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import { sampleProgress, validBackup } from '../fixtures/saves/corpus.ts';
import {
  chooseFile,
  createBackupDownload,
  downloadOnly,
  downloadedText,
  openSave,
} from './support/fichiers.ts';
import {
  openGame,
  runFor,
  skipCountdown,
  startClassic,
  startMode,
  watchProblems,
} from './support/jeu.ts';
import { SEED_DATE, progressWith, seedStorage } from './support/sauvegarde.ts';

/** Mots anglais usuels qui ne doivent jamais apparaître dans le jeu (mots entiers, hors orthographe française). */
const ENGLISH_WORDS = [
  'the',
  'and',
  'or',
  'play',
  'settings',
  'setting',
  'save',
  'restore',
  'cancel',
  'close',
  'back',
  'loading',
  'error',
  'retry',
  'continue',
  'yes',
  'no',
  'ok',
  'new',
  'game',
  'over',
  'high',
  'install',
  'update',
  'offline',
  'resume',
  'quit',
  'start',
  'next',
  'previous',
  'level',
  'time',
  'please',
  'failed',
  'success',
  'welcome',
];

/** Tous les textes que le joueur peut lire sur l'écran affiché : texte visible, zones vivantes, noms accessibles. */
async function readableTexts(page: Page): Promise<string> {
  return page.evaluate(() => {
    // Le message « Prêt à jouer hors ligne » (message passager et zone vivante des lecteurs d'écran, qui garde la
    // dernière annonce) apparaît quand l'agent de service a fini de préparer le hors ligne : à un instant qui
    // dépend de la machine, donc pas du contenu de l'écran. Il est écarté du texte relevé.
    const transient = [
      ...document.querySelectorAll<HTMLElement>('body > .toast, body > [role="status"]'),
    ].filter((element) => element.textContent.trim() === 'Prêt à jouer hors ligne');
    for (const element of transient) element.style.display = 'none';
    const text = document.body.innerText;
    for (const element of transient) element.style.display = '';
    const parts = [document.title, text];
    for (const element of document.querySelectorAll('[aria-label], [title], img[alt]')) {
      parts.push(
        element.getAttribute('aria-label') ??
          element.getAttribute('title') ??
          element.getAttribute('alt') ??
          '',
      );
    }
    return parts.join('\n');
  });
}

async function back(page: Page, heading = 'Serpent Cosmique'): Promise<void> {
  await page.getByRole('button', { name: '‹ Retour' }).tap();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
}

/** Parcourt tous les écrans du jeu et renvoie, écran par écran, ce qui est lisible. */
async function walkAllScreens(page: Page): Promise<Record<string, string>> {
  const screens: Record<string, string> = {};
  await seedStorage(page, {
    progress: progressWith((progress) => {
      progress.counters.totalCandies = 1234;
      progress.counters.gamesByMode.classic = 1234;
      progress.records.classic = [
        { name: 'Coco', score: 1234, dateTime: SEED_DATE },
        { name: 'Léa', score: 987, dateTime: '2026-01-05T08:09:10' },
      ];
      progress.lastName = 'Coco';
    }),
  });
  await openGame(page, { seed: 1 });
  screens['menu'] = await readableTexts(page);

  await page.getByRole('button', { name: 'Jouer', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Choisissez un mode', level: 1 })).toBeVisible();
  screens['modes'] = await readableTexts(page);
  await back(page);

  await page.getByRole('button', { name: 'Records', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Records', level: 1 })).toBeAttached();
  for (let mode = 0; mode < 7; mode += 1) {
    screens[`records ${mode}`] = await readableTexts(page);
    await page.getByRole('button', { name: 'Mode suivant' }).tap();
  }
  await back(page);

  await page.getByRole('button', { name: 'Skins', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Skins', level: 1 })).toBeVisible();
  for (const category of await page.getByRole('tab').all()) {
    await category.tap();
    screens[`skins ${await category.textContent()}`] = await readableTexts(page);
  }
  await back(page);

  await page.getByRole('button', { name: 'Réglages', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Réglages', level: 1 })).toBeVisible();
  screens['réglages'] = await readableTexts(page);
  await page.getByRole('button', { name: 'À propos' }).tap();
  await expect(page.getByRole('heading', { name: 'À propos', level: 1 })).toBeVisible();
  screens['à propos'] = await readableTexts(page);
  await back(page, 'Réglages');
  await back(page);

  await page.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Sauvegarde', level: 1 })).toBeVisible();
  screens['sauvegarde'] = await readableTexts(page);
  await chooseFile(page, { bytes: Buffer.from('pas une sauvegarde') });
  await expect(page.getByRole('dialog')).toBeVisible();
  screens['erreur E-01'] = await readableTexts(page);
  await page.keyboard.press('Escape');
  await chooseFile(page, { bytes: Buffer.from(await validBackup(sampleProgress())) });
  await expect(page.getByRole('dialog')).toBeVisible();
  screens['résumé de restauration'] = await readableTexts(page);
  await page.keyboard.press('Escape');
  await back(page);

  await page.getByRole('button', { name: 'Installer le jeu' }).tap();
  await expect(page.getByRole('heading', { name: 'Installer le jeu', level: 1 })).toBeVisible();
  screens['installation'] = await readableTexts(page);
  await back(page);

  await startClassic(page);
  await runFor(page, 50);
  screens['compte à rebours'] = await readableTexts(page);
  await skipCountdown(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  screens['pause'] = await readableTexts(page);
  await page.getByRole('button', { name: 'Abandonner' }).tap();
  screens['confirmation d’abandon'] = await readableTexts(page);
  await page.getByRole('button', { name: 'Oui' }).tap();
  await expect(page.locator('.end')).toBeVisible();
  screens['fin de partie'] = await readableTexts(page);
  return screens;
}

async function walkIn(
  browser: Browser,
  baseURL: string,
  locale: string,
  timezoneId: string,
  device: Record<string, unknown>,
): Promise<{ screens: Record<string, string>; problems: string[] }> {
  const context = await browser.newContext({ ...device, baseURL, locale, timezoneId });
  try {
    const page = await context.newPage();
    const problems = watchProblems(page);
    const screens = await walkAllScreens(page);
    return { screens, problems };
  } finally {
    await context.close();
  }
}

test('ct_87_langue_et_formats : tous les écrans en français, dates JJ/MM/AAAA, milliers séparés, identiques en en-US et à New York', async ({
  browser,
}, testInfo) => {
  test.setTimeout(180_000);
  const use = testInfo.project.use;
  const device = {
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor,
    hasTouch: use.hasTouch,
    isMobile: use.isMobile,
  };
  const baseURL = String(use.baseURL);
  const french = await walkIn(browser, baseURL, 'fr-FR', 'Europe/Paris', device);
  const english = await walkIn(browser, baseURL, 'en-US', 'America/New_York', device);
  expect(french.problems).toEqual([]);
  expect(english.problems).toEqual([]);

  // Aucun mot anglais usuel, dans aucun écran, quelle que soit la langue du navigateur.
  const pattern = new RegExp(`(?<![\\p{L}'’-])(${ENGLISH_WORDS.join('|')})(?![\\p{L}'’-])`, 'iu');
  // Contrôle de la liste elle-même : elle reconnaît bien un texte anglais.
  expect(pattern.test('Settings: play the game')).toBe(true);
  expect(Object.keys(english.screens).length).toBeGreaterThanOrEqual(20);
  expect(english.screens['menu']).toContain('Jouer');
  expect(english.screens['fin de partie']).toContain('Partie abandonnée');
  for (const [name, text] of Object.entries(english.screens)) {
    const found = pattern.exec(text);
    expect(found, `écran « ${name} » : mot anglais « ${found?.[0]} »`).toBeNull();
  }

  // Les textes sont identiques, caractère pour caractère, avec la langue et le fuseau d'un autre pays.
  expect(Object.keys(english.screens)).toEqual(Object.keys(french.screens));
  for (const name of Object.keys(french.screens)) {
    expect(english.screens[name], `écran « ${name} »`).toBe(french.screens[name]);
  }

  // Nombres : espace insécable (ou fine) entre les milliers, jamais de virgule ni de point.
  const records = french.screens['records 0'] ?? '';
  expect(records).toMatch(new RegExp('1[\u00a0\u202f]234'));
  expect(records).not.toMatch(/1,234|1\.234/);
  const skins = Object.values(french.screens).join('\n');
  expect(skins).toMatch(new RegExp('1[\u00a0\u202f]000 bonbons'));
  // Dates des records : JJ/MM/AAAA, à partir de l'heure locale enregistrée.
  expect(records).toContain('31/10/2026');
  expect(records).toContain('05/01/2026');
  expect(french.screens['résumé de restauration']).toMatch(/\b01\/11\/2026\b/);
  expect(french.screens['résumé de restauration']).toContain('14:30');
});

test('ct_83_temps_de_navigation : démarrage en 3 s, lancement d’une partie en 1 s, changement d’écran en 0,5 s — cinq mesures, processeur ralenti 4 fois, cache chaud', async ({
  page,
  context,
}) => {
  // Cache chaud : une première ouverture installe le mode hors ligne.
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const starts: number[] = [];
  const launches: number[] = [];
  const screens: number[] = [];
  for (let measure = 0; measure < 5; measure += 1) {
    let began = Date.now();
    await page.goto('/');
    await page.getByRole('button', { name: 'Jouer' }).waitFor();
    starts.push(Date.now() - began);
    began = Date.now();
    await page.getByRole('button', { name: 'Jouer' }).tap();
    await page.getByRole('heading', { name: 'Choisissez un mode' }).waitFor();
    screens.push(Date.now() - began);
    began = Date.now();
    await page.getByRole('button', { name: 'Classique' }).tap();
    await page.locator('.countdown-number').waitFor();
    launches.push(Date.now() - began);
  }
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  test.info().annotations.push({
    type: 'mesures (ms, processeur ×4)',
    description: `démarrage ${starts.join('/')} ; écran ${screens.join('/')} ; lancement ${launches.join('/')}`,
  });
  expect(Math.max(...starts)).toBeLessThan(3000);
  expect(Math.max(...screens)).toBeLessThan(500);
  expect(Math.max(...launches)).toBeLessThan(1000);
});

test('ct_84_regularite_des_pas : en mode Zen pendant 30 s, au moins 50 images par seconde et pas réguliers (mesure indicative sur poste)', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const state = { frames: 0, start: 0, last: 0, steps: [] as number[], row: '' };
    (window as unknown as { __perf: typeof state }).__perf = state;
    const measure = (now: number): void => {
      if (state.start === 0) state.start = now;
      state.frames += 1;
      state.last = now;
      const canvas = document.querySelector('canvas');
      const context = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && context) {
        // Ligne 6 : la tête et le corps du serpent (rose, au départ) — un pas change cette ligne.
        const size = canvas.width / 24;
        const y = Math.floor(5.5 * size);
        const data = context.getImageData(0, y, canvas.width, 1).data;
        let bits = '';
        for (let col = 0; col < 24; col += 1) {
          const index = Math.floor((col + 0.5) * size) * 4;
          bits += (data[index] ?? 0) > 0xc0 && (data[index + 1] ?? 0) < 0xb0 ? '1' : '0';
        }
        if (bits !== state.row) {
          if (state.row !== '') state.steps.push(now);
          state.row = bits;
        }
      }
      requestAnimationFrame(measure);
    };
    requestAnimationFrame(measure);
  });
  await page.goto('/?seed=1');
  await page.getByRole('button', { name: 'Jouer' }).tap();
  await page.getByRole('button', { name: /^Zen/ }).tap();
  await expect(page.locator('.countdown-number')).toBeHidden({ timeout: 10_000 });
  const mark = await page.evaluate(
    () => (window as unknown as { __perf: { frames: number; last: number } }).__perf,
  );
  await page.waitForTimeout(30_000);
  const result = await page.evaluate(() => {
    const perf = (
      window as unknown as { __perf: { frames: number; last: number; steps: number[] } }
    ).__perf;
    return { frames: perf.frames, last: perf.last, steps: perf.steps };
  });
  const seconds = (result.last - mark.last) / 1000;
  const fps = (result.frames - mark.frames) / seconds;
  const steps = result.steps.filter((time) => time > mark.last);
  const intervals = steps.slice(1).map((time, index) => time - (steps[index] ?? 0));
  const nominal = 1000 / 6;
  const within = intervals.filter((value) => Math.abs(value - nominal) <= nominal * 0.1).length;
  test.info().annotations.push({
    type: 'mesures (poste)',
    description: `${fps.toFixed(1)} images/s ; ${intervals.length} pas ; ${((100 * within) / intervals.length).toFixed(1)} % à ± 10 % ; plus long ${Math.max(...intervals).toFixed(0)} ms`,
  });
  expect(fps).toBeGreaterThanOrEqual(50);
  expect(intervals.length).toBeGreaterThan(100);
  expect(within / intervals.length).toBeGreaterThanOrEqual(0.95);
  expect(Math.max(...intervals)).toBeLessThanOrEqual(2 * nominal);
});

/** Mémoire de script utilisée par la page, après un ramasse-miettes (protocole de débogage de Chromium). */
async function heapBytes(page: Page): Promise<number> {
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('HeapProfiler.collectGarbage');
    const usage = (await client.send('Runtime.getHeapUsage')) as { usedSize: number };
    return usage.usedSize;
  } finally {
    await client.detach();
  }
}

/** Quitte la partie en cours (abandon si elle n'est pas finie) et revient au menu. */
async function leaveGame(page: Page): Promise<void> {
  if ((await page.locator('.end').count()) === 0) {
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Abandonner' }).tap();
    await page.getByRole('button', { name: 'Oui' }).tap();
  }
  await page.getByRole('button', { name: 'Menu' }).tap();
}

test('ct_89_endurance_automatisee : 50 pauses, 20 sauvegardes puis restaurations et une partie de chaque mode, sans erreur et avec une mémoire bornée', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'La mémoire se lit par le protocole de débogage de Chromium.',
  );
  test.setTimeout(240_000);
  const problems = watchProblems(page);
  page.on('crash', () => problems.push('plantage de la page'));
  await downloadOnly(page);
  await seedStorage(page, {
    // Trois parties terminées : le mode mystère est découvert et figure dans la liste.
    progress: progressWith((progress) => {
      progress.counters.gamesByMode.classic = 3;
    }),
  });
  await openGame(page, { seed: 1 });

  // Une première série sert d'état de référence : les caches et les polices sont déjà chargés.
  await startMode(page, 'Zen');
  await runFor(page, 50);
  await skipCountdown(page);
  await runFor(page, 2000);
  const baseline = await heapBytes(page);

  // 50 cycles pause / reprise (le Zen ne se perd jamais).
  for (let cycle = 0; cycle < 50; cycle += 1) {
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await runFor(page, 500);
    await page.getByRole('button', { name: 'Reprendre' }).tap();
    await skipCountdown(page);
    await runFor(page, 1000);
  }
  await leaveGame(page);

  // 20 sauvegardes, chacune restaurée aussitôt.
  for (let round = 0; round < 20; round += 1) {
    await openSave(page);
    const bytes = Buffer.from(await downloadedText(await createBackupDownload(page)));
    await chooseFile(page, { bytes });
    await page.getByRole('dialog').getByRole('button', { name: 'Fusionner' }).tap();
    await expect(page.locator('.toast')).toContainText('Restauration terminée');
    await page.getByRole('button', { name: '‹ Retour' }).tap();
  }

  // Une partie de chaque mode, d'une demi-minute de jeu.
  for (const mode of [
    'Classique',
    'Contre la montre',
    "Champ d'astéroïdes",
    'Trou noir',
    'Bonus et pièges',
    'Zen',
    'Constellation',
  ]) {
    await startMode(page, mode);
    await runFor(page, 50);
    await skipCountdown(page);
    await runFor(page, 30_000);
    await leaveGame(page);
  }

  const final = await heapBytes(page);
  test.info().annotations.push({
    type: 'mémoire (octets)',
    description: `départ ${baseline} ; arrivée ${final} ; croissance ${(((final - baseline) / baseline) * 100).toFixed(1)} %`,
  });
  expect(final).toBeLessThan(baseline * 1.5);
  await expect(page.getByRole('button', { name: 'Jouer' })).toBeVisible();
  expect(problems).toEqual([]);
});

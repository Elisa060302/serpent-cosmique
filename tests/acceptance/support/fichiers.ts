/** Aides de recette pour la sauvegarde : sélecteurs simulés, téléchargements, sonde d'écriture IndexedDB. */
import { expect } from '@playwright/test';
import type { Download, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Retire du navigateur les moyens d'enregistrer qui demandent une fenêtre du système (sélecteur, partage) :
 * la sauvegarde passe alors par un téléchargement, que Playwright observe. À appeler avant `openGame`.
 */
export async function downloadOnly(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined, configurable: true });
    Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true });
    Object.defineProperty(Navigator.prototype, 'canShare', {
      value: undefined,
      configurable: true,
    });
  });
}

/** Une erreur durable porte l'icône « ! » en plus du texte et du code ; l'icône est masquée aux lecteurs d'écran (05 § 6). */
export async function expectErrorIcon(page: Page): Promise<void> {
  const icon = page.getByRole('dialog').locator('.toast-icon');
  await expect(icon).toHaveText('!');
  await expect(icon).toHaveAttribute('aria-hidden', 'true');
}

export type PickerBehavior = 'ok' | 'quota' | 'denied' | 'cancel' | 'replace' | 'refuse';

/**
 * Sélecteur d'enregistrement simulé : `window.__pickerBehavior` dit s'il réussit, manque de place,
 * échoue autrement ou est annulé. Les fichiers « écrits » sont lus dans `window.__written`.
 * Deux comportements désignent un fichier existant (`window.__existing`, voir `setExistingFile`) :
 * « replace » (le joueur le choisit et confirme le remplacement : le contenu est remplacé à la fermeture)
 * et « refuse » (il ne confirme pas : la fenêtre est refermée, rien n'est écrit).
 */
export async function fakeSavePicker(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    scope['__pickerBehavior'] = 'ok';
    scope['__written'] = [];
    scope['showSaveFilePicker'] = (options: { suggestedName: string }) => {
      const behavior = scope['__pickerBehavior'];
      if (behavior === 'cancel' || behavior === 'refuse') {
        return Promise.reject(new DOMException('Annulé', 'AbortError'));
      }
      const existing = scope['__existing'] as { name: string; content: string } | undefined;
      const replacing = behavior === 'replace' && existing !== undefined;
      let pending = '';
      return Promise.resolve({
        name: replacing ? existing.name : options.suggestedName,
        createWritable: () =>
          Promise.resolve({
            write: (data: string) => {
              if (replacing) {
                pending = data;
                (scope['__written'] as string[]).push(data);
                return Promise.resolve();
              }
              if (behavior === 'quota') {
                return Promise.reject(new DOMException('Plein', 'QuotaExceededError'));
              }
              if (behavior === 'denied') {
                return Promise.reject(new DOMException('Refusé', 'NotAllowedError'));
              }
              (scope['__written'] as string[]).push(data);
              return Promise.resolve();
            },
            close: () => {
              if (replacing) existing.content = pending;
              return Promise.resolve();
            },
            abort: () => Promise.resolve(),
          }),
      });
    };
  });
}

/** Fichier déjà présent à l'emplacement que le sélecteur simulé désigne (comportements « replace » et « refuse »). */
export async function setExistingFile(page: Page, name: string, content: string): Promise<void> {
  await page.evaluate(
    (file) => {
      (window as unknown as Record<string, unknown>)['__existing'] = file;
    },
    { name, content },
  );
}

export async function existingFile(page: Page): Promise<{ name: string; content: string }> {
  return page.evaluate(
    () =>
      (window as unknown as Record<string, { name: string; content: string }>)['__existing'] ?? {
        name: '',
        content: '',
      },
  );
}

export async function setPickerBehavior(page: Page, behavior: PickerBehavior): Promise<void> {
  await page.evaluate((value) => {
    (window as unknown as Record<string, unknown>)['__pickerBehavior'] = value;
  }, behavior);
}

export async function writtenFiles(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as Record<string, string[]>)['__written'] ?? []);
}

/**
 * Sonde sur les écritures IndexedDB : compte les transactions en écriture et, si `window.__failWrites` est vrai,
 * les annule aussitôt (écriture refusée). À appeler avant `openGame`.
 */
export async function writeProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    scope['__writes'] = 0;
    scope['__failWrites'] = false;
    const prototype: { transaction: IDBDatabase['transaction'] } = IDBDatabase.prototype;
    const original = prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<typeof original>) {
      const transaction = original.apply(this, args);
      if (args[1] === 'readwrite') {
        scope['__writes'] = (scope['__writes'] as number) + 1;
        if (scope['__failWrites'] === true) queueMicrotask(() => transaction.abort());
      }
      return transaction;
    };
  });
}

export async function failWrites(page: Page, fail: boolean): Promise<void> {
  await page.evaluate((value) => {
    (window as unknown as Record<string, unknown>)['__failWrites'] = value;
  }, fail);
}

export async function writeCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as Record<string, number>)['__writes'] ?? 0);
}

/** Compte les lectures du contenu d'un fichier (`File.prototype.text`). À appeler avant `openGame`. */
export async function readProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const scope = window as unknown as Record<string, unknown>;
    scope['__reads'] = 0;
    const prototype: { text: File['text'] } = File.prototype;
    const original = prototype.text;
    File.prototype.text = function () {
      scope['__reads'] = (scope['__reads'] as number) + 1;
      return original.call(this);
    };
  });
}

export async function readCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as Record<string, number>)['__reads'] ?? 0);
}

/** Menu → « Sauvegarde » : un toucher. */
export async function openSave(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Sauvegarde', exact: true }).tap();
  await expect(page.getByRole('heading', { name: 'Sauvegarde', level: 1 })).toBeVisible();
}

/** « Restaurer une sauvegarde », puis choix du fichier dans le sélecteur du système. */
export async function chooseFile(
  page: Page,
  file: { name?: string; bytes: Uint8Array | Buffer },
): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Restaurer une sauvegarde' }).tap();
  await (
    await chooser
  ).setFiles({
    name: file.name ?? 'sauvegarde.json',
    mimeType: 'application/json',
    buffer: Buffer.from(file.bytes),
  });
}

/** « Créer une sauvegarde » (téléchargement) : renvoie le téléchargement observé. */
export async function createBackupDownload(page: Page): Promise<Download> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Créer une sauvegarde' }).tap();
  return download;
}

export async function downloadedText(download: Download): Promise<string> {
  const path = await download.path();
  return readFileSync(path, 'utf-8');
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countRecords, mergeProgress } from '../../src/core/merge.ts';
import { defaultProgress } from '../../src/core/progress.ts';
import { MODE_IDS, SKINS } from '../../src/core/rules.ts';
import { readBackup } from '../../src/core/savefile.ts';
import type { ProgressData, RecordEntry } from '../../src/core/types.ts';
import { validateProgressData } from '../../src/core/validation.ts';
import { maximalProgress, validBackup } from '../fixtures/saves/corpus.ts';

const NOW = new Date(2026, 10, 2, 12, 0, 0);

function record(name: string, score: number, day: number): RecordEntry {
  return { name, score, dateTime: `2026-10-${String(day).padStart(2, '0')}T10:00:00` };
}

function withClassic(records: RecordEntry[]): ProgressData {
  const progress = defaultProgress();
  progress.records.classic = records;
  return progress;
}

describe('ct_53_fusion_regles : records, compteurs, idempotence (RG-70)', () => {
  it('6 + 7 records dont 2 communs donnent les 10 meilleurs des 11 distincts', () => {
    const shared = [record('Léa', 30, 3), record('Max', 25, 4)];
    const local = withClassic([
      record('Zoé', 40, 5),
      shared[0] as RecordEntry,
      shared[1] as RecordEntry,
      record('Ana', 20, 6),
      record('Bob', 15, 7),
      record('Cyd', 9, 8),
    ]);
    const incoming = withClassic([
      record('Dan', 50, 9),
      shared[0] as RecordEntry,
      shared[1] as RecordEntry,
      record('Eve', 22, 10),
      record('Fay', 12, 11),
      record('Gus', 8, 12),
      record('Hal', 3, 13),
    ]);
    const merged = mergeProgress(local, incoming);
    const scores = merged.records.classic.map((entry) => entry.score);
    assert.equal(
      new Set([...local.records.classic, ...incoming.records.classic].map((r) => JSON.stringify(r)))
        .size,
      11,
    );
    assert.deepEqual(scores, [50, 40, 30, 25, 22, 20, 15, 12, 9, 8]);
    assert.ok(!merged.records.classic.some((entry) => entry.name === 'Hal'));
  });

  it('un record identique (nom, score, date et heure) n’est compté qu’une fois ; un nom ou une heure différents font deux records', () => {
    const base = record('Léa', 30, 3);
    const other = { name: 'Léa', score: 30, dateTime: '2026-10-03T10:00:01' };
    const merged = mergeProgress(withClassic([base]), withClassic([{ ...base }, other]));
    assert.equal(merged.records.classic.length, 2);
  });

  it('à score égal, le plus ancien reste avant (RG-47)', () => {
    const merged = mergeProgress(
      withClassic([record('Récent', 30, 9)]),
      withClassic([record('Ancien', 30, 2)]),
    );
    assert.deepEqual(
      merged.records.classic.map((entry) => entry.name),
      ['Ancien', 'Récent'],
    );
  });

  it('la seconde restauration du même fichier ne change rien', () => {
    const local = withClassic([record('Zoé', 40, 5), record('Ana', 20, 6)]);
    local.counters.totalCandies = 80;
    const incoming = withClassic([record('Dan', 50, 9), record('Ana', 20, 6)]);
    incoming.counters.totalCandies = 120;
    const once = mergeProgress(local, incoming);
    assert.deepEqual(mergeProgress(once, incoming), once);
  });

  it('chaque compteur prend la plus grande des deux valeurs ; choix, réglages et dernier nom viennent du fichier', () => {
    const local = defaultProgress();
    local.counters.totalCandies = 500;
    local.counters.gamesByMode.classic = 7;
    local.counters.gamesByMode.zen = 0;
    local.lastName = 'Local';
    local.settings.control = 'arrows';
    const incoming = defaultProgress();
    incoming.counters.totalCandies = 90;
    incoming.counters.gamesByMode.classic = 2;
    incoming.counters.gamesByMode.zen = 4;
    incoming.lastName = 'Fichier';
    incoming.settings = { control: 'swipe', sounds: false, music: false, vibrations: false };
    const merged = mergeProgress(local, incoming);
    assert.equal(merged.counters.totalCandies, 500);
    assert.equal(merged.counters.gamesByMode.classic, 7);
    assert.equal(merged.counters.gamesByMode.zen, 4);
    assert.equal(merged.lastName, 'Fichier');
    assert.deepEqual(merged.settings, incoming.settings);
    assert.deepEqual(merged.skins.selected, incoming.skins.selected);
  });

  it('les tableaux de chaque mode sont fusionnés séparément', () => {
    const local = defaultProgress();
    local.records.zen = [record('Zen', 12, 3)];
    const incoming = defaultProgress();
    incoming.records.asteroids = [record('Astéroïde', 7, 4)];
    const merged = mergeProgress(local, incoming);
    assert.equal(merged.records.zen.length, 1);
    assert.equal(merged.records.asteroids.length, 1);
    assert.equal(merged.records.classic.length, 0);
    assert.equal(countRecords(merged), 2);
  });
});

describe('ct_44_skin_definitif_restauration : skins réunis, jamais retirés (RG-57)', () => {
  it('des skins disjoints sont réunis dans l’ordre du catalogue', () => {
    const local = defaultProgress();
    local.skins.unlocked = [...local.skins.unlocked, 'trail-stardust'];
    const incoming = defaultProgress();
    incoming.skins.unlocked = [...incoming.skins.unlocked, 'pattern-dots'];
    const merged = mergeProgress(local, incoming);
    assert.ok(merged.skins.unlocked.includes('trail-stardust'));
    assert.ok(merged.skins.unlocked.includes('pattern-dots'));
    const catalogue = SKINS.map((skin) => skin.id as string);
    assert.deepEqual(
      merged.skins.unlocked,
      catalogue.filter((id) => merged.skins.unlocked.includes(id as never)),
    );
  });

  it('un skin débloqué sur le téléphone le reste même si le fichier ne le contient pas', () => {
    const local = defaultProgress();
    local.skins.unlocked = [...local.skins.unlocked, 'trail-stardust'];
    const merged = mergeProgress(local, defaultProgress());
    assert.ok(merged.skins.unlocked.includes('trail-stardust'));
  });

  it('les conditions sont revérifiées sur les compteurs fusionnés et sur les meilleurs scores (RG-56)', () => {
    const local = defaultProgress();
    local.counters.totalCandies = 120;
    const incoming = defaultProgress();
    incoming.records.classic = [record('Cap', 15, 3)];
    incoming.counters.gamesByMode.classic = 1;
    const merged = mergeProgress(local, incoming);
    assert.ok(merged.skins.unlocked.includes('trail-stardust'), '100 bonbons');
    assert.ok(merged.skins.unlocked.includes('shape-comet'), '15 points en Classique');
    assert.ok(!merged.skins.unlocked.includes('shape-rocket'));
  });

  it('les compteurs fusionnés peuvent compléter la condition « tous les modes »', () => {
    const local = defaultProgress();
    const incoming = defaultProgress();
    for (const mode of MODE_IDS.slice(0, 4)) local.counters.gamesByMode[mode] = 1;
    for (const mode of MODE_IDS.slice(3)) incoming.counters.gamesByMode[mode] = 1;
    assert.ok(mergeProgress(local, incoming).skins.unlocked.includes('decor-milky-way'));
  });
});

describe('ct_56_fusion_atomique : structure neuve, sans pollution d’objets (EXS-05)', () => {
  it('le résultat est une structure neuve : aucun objet n’est partagé avec les entrées', () => {
    const local = withClassic([record('Zoé', 40, 5)]);
    const incoming = withClassic([record('Dan', 50, 9)]);
    const snapshot = JSON.stringify([local, incoming]);
    const merged = mergeProgress(local, incoming);
    assert.equal(JSON.stringify([local, incoming]), snapshot);
    for (const entry of merged.records.classic) {
      assert.ok(
        !local.records.classic.includes(entry) && !incoming.records.classic.includes(entry),
      );
    }
    assert.notEqual(merged.skins.unlocked, local.skins.unlocked);
    assert.notEqual(merged.skins.unlocked, incoming.skins.unlocked);
    assert.notEqual(merged.settings, incoming.settings);
    assert.notEqual(merged.counters.gamesByMode, local.counters.gamesByMode);
  });

  it('Object.prototype est inchangé après la lecture et la fusion d’un fichier contenant __proto__', async () => {
    const valid = await validBackup();
    const hostile = valid.replace('"data":{', '"data":{"__proto__":{"polluted":true},');
    assert.deepEqual(await readBackup(hostile, NOW), { status: 'invalid' });
    const reading = await readBackup(valid, NOW);
    assert.equal(reading.status, 'valid');
    if (reading.status === 'valid') mergeProgress(defaultProgress(), reading.envelope.data);
    assert.equal(Object.keys(Object.prototype).length, 0);
    assert.equal(({} as Record<string, unknown>)['polluted'], undefined);
    assert.equal(Object.getPrototypeOf({}), Object.prototype);
  });

  it('le résultat de la fusion passe le validateur : il peut être enregistré tel quel', () => {
    const merged = mergeProgress(maximalProgress(), defaultProgress());
    const revalidated = validateProgressData(JSON.parse(JSON.stringify(merged)), NOW, true);
    assert.deepEqual(revalidated, merged);
  });

  it('la fusion de deux progressions maximales reste dans les bornes du dictionnaire', () => {
    const merged = mergeProgress(maximalProgress(), maximalProgress());
    for (const mode of MODE_IDS) assert.ok(merged.records[mode].length <= 10);
    assert.equal(countRecords(merged), 70);
  });
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { createRandom } from '../../src/core/random.ts';
import { LIMITS, SAVE_FORMAT } from '../../src/core/rules.ts';
import { backupFileName, readBackup, readEnvelope } from '../../src/core/savefile.ts';
import {
  BACKUP_CREATED_AT,
  maximalProgress,
  paddedTo,
  sampleProgress,
  trapCorpus,
  validBackup,
} from '../fixtures/saves/corpus.ts';

const NOW = new Date(2026, 10, 2, 12, 0, 0);
const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

describe('ct_55_fichiers_invalides : le corpus piégé est entièrement refusé (EXS-04, EXS-17)', () => {
  it('chaque fichier donne E-01 (E-02 pour la version future), sans exception, et Object.prototype reste intact', async () => {
    const before = Object.keys(Object.prototype).length;
    const corpus = await trapCorpus();
    assert.ok(corpus.length >= 60);
    for (const file of corpus) {
      const reading = await readBackup(decode(file.bytes), NOW);
      assert.equal(reading.status, file.expected, file.label);
    }
    assert.equal(Object.keys(Object.prototype).length, before);
    assert.equal(({} as Record<string, unknown>)['polluted'], undefined);
  });

  it('les fichiers au-delà de 262 144 octets sont refusés sans que leur contenu soit examiné', async () => {
    const valid = await validBackup();
    const tooLarge = decode(paddedTo(valid, LIMITS.importFileMaxBytes + 1));
    assert.deepEqual(await readBackup(tooLarge, NOW), { status: 'invalid' });
  });
});

describe('ct_57_taille_et_mutations : taille limite et mutations aléatoires', () => {
  it('un fichier valide complété d’espaces jusqu’à 262 144 octets est accepté', async () => {
    const valid = await validBackup();
    const reading = await readBackup(decode(paddedTo(valid, LIMITS.importFileMaxBytes)), NOW);
    assert.equal(reading.status, 'valid');
  });

  it('10 000 mutations reproductibles : aucune exception, aucune acceptée sans somme correcte', async () => {
    const original = sampleProgress();
    const text = await validBackup(original);
    const random = createRandom(20261107);
    let accepted = 0;
    for (let index = 0; index < 10_000; index += 1) {
      const chars = [...text];
      const position = random.nextInt(chars.length);
      const kind = random.nextInt(4);
      const replacement = String.fromCharCode(32 + random.nextInt(95));
      if (kind === 0) chars[position] = replacement;
      else if (kind === 1) chars.splice(position, 1);
      else if (kind === 2) chars.splice(position, 0, replacement);
      else chars.length = position;
      const reading = await readBackup(chars.join(''), NOW);
      if (reading.status !== 'valid') continue;
      accepted += 1;
      assert.deepEqual(reading.envelope.data, original, 'une donnée modifiée a été acceptée');
    }
    assert.ok(accepted < 10_000);
  });
});

describe('ct_50_creation_sauvegarde : nom du fichier et contenu', () => {
  it('le nom suit RG-68 : date et minute locales, extension .json', () => {
    assert.equal(
      backupFileName('2026-11-01T14:30:59', new Set()),
      'serpent-cosmique-sauvegarde-2026-11-01-1430.json',
    );
    assert.equal(
      backupFileName('2026-01-05T09:05:00', new Set()),
      'serpent-cosmique-sauvegarde-2026-01-05-0905.json',
    );
  });

  it('suffixe -N, N étant le plus petit entier à partir de 2 qui donne un nom nouveau', () => {
    const used = new Set<string>();
    const names: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const name = backupFileName('2026-11-01T14:30:00', used);
      used.add(name);
      names.push(name);
    }
    assert.deepEqual(names, [
      'serpent-cosmique-sauvegarde-2026-11-01-1430.json',
      'serpent-cosmique-sauvegarde-2026-11-01-1430-2.json',
      'serpent-cosmique-sauvegarde-2026-11-01-1430-3.json',
    ]);
    assert.equal(
      backupFileName('2026-11-01T14:31:00', used),
      'serpent-cosmique-sauvegarde-2026-11-01-1431.json',
    );
  });

  it('le fichier contient exactement format, formatVersion, createdAt, data et checksum', async () => {
    const parsed = JSON.parse(await validBackup()) as Record<string, unknown>;
    assert.deepEqual(Object.keys(parsed), [
      'format',
      'formatVersion',
      'createdAt',
      'data',
      'checksum',
    ]);
    assert.equal(parsed['format'], SAVE_FORMAT.name);
    assert.equal(parsed['createdAt'], BACKUP_CREATED_AT);
    assert.deepEqual(Object.keys(parsed['data'] as object), [
      'records',
      'lastName',
      'skins',
      'counters',
      'settings',
    ]);
  });

  it('un fichier créé est relu à l’identique par la lecture du fichier importé', async () => {
    const original = sampleProgress();
    const reading = await readBackup(await validBackup(original), NOW);
    assert.equal(reading.status, 'valid');
    assert.deepEqual(reading.status === 'valid' ? reading.envelope.data : null, original);
  });

  it('une sauvegarde d’une version de format plus ancienne que la version connue serait acceptée (RG-72)', async () => {
    assert.equal(SAVE_FORMAT.version, 1);
    const text = await validBackup();
    assert.ok(await readEnvelope(text, NOW));
  });
});

describe('ct_58_donnees_maximales : 50 Ko, 2 s, 3 s', () => {
  it('le jeu de données maximal tient en 51 200 octets, se crée en 2 s et se relit en 3 s', async () => {
    const maximal = maximalProgress();
    const createStart = performance.now();
    const text = await validBackup(maximal);
    assert.ok(performance.now() - createStart < 2000);
    assert.ok(new TextEncoder().encode(text).length <= 51_200);
    const readStart = performance.now();
    const reading = await readBackup(text, NOW);
    assert.ok(performance.now() - readStart < 3000);
    assert.equal(reading.status, 'valid');
    assert.deepEqual(reading.status === 'valid' ? reading.envelope.data : null, maximal);
  });
});

describe('ct_122_depot_public : SECURITY.md décrit le fichier de sauvegarde (EXS-15)', () => {
  const security = readFileSync(new URL('../../SECURITY.md', import.meta.url), 'utf-8');

  it('contenu du fichier, absence de chiffrement et lecture possible par qui le reçoit', () => {
    assert.match(security, /## Fichier de sauvegarde/);
    assert.match(security, /records avec les noms saisis/);
    assert.match(security, /n'est pas chiffré/);
    assert.match(security, /lisibles par toute personne qui le reçoit/);
  });

  it('prudence avec un fichier d’origine inconnue et limite de taille', () => {
    assert.match(security, /Ne restaurez que des fichiers que vous avez créés vous-même/);
    assert.match(security, /fichier d'origine inconnue/);
    assert.match(security, /256 Kio/);
  });
});

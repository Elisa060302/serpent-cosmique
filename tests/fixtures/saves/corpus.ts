/**
 * Fabrique de fichiers de sauvegarde fictifs : un fichier valide et le corpus de fichiers piégés (abîmés, modifiés,
 * d'une autre application ou hostiles) que le jeu doit refuser entièrement. Les données sont inventées et
 * les fichiers produits de façon reproductible : rien n'est stocké, tout est construit au lancement du test.
 */
import { applyFinishedGame, defaultProgress } from '../../../src/core/progress.ts';
import { createRandom } from '../../../src/core/random.ts';
import { LIMITS, MODE_IDS, SAVE_FORMAT, SKINS } from '../../../src/core/rules.ts';
import { serializeEnvelope, sha256Hex } from '../../../src/core/savefile.ts';
import type { ProgressData } from '../../../src/core/types.ts';

/** Date de création des fichiers fictifs, antérieure à l'horloge des tests. */
export const BACKUP_CREATED_AT = '2026-11-01T14:30:00';

/** Progression fictive non vide : un record Classique de 42 points et les compteurs correspondants. */
export function sampleProgress(): ProgressData {
  return applyFinishedGame(defaultProgress(), {
    mode: 'classic',
    score: 42,
    candiesEaten: 42,
    dateTime: '2026-11-01T14:02:11',
  }).progress;
}

/** Jeu de données maximal (ENF-08) : 7 tableaux de 10 records à noms de 12 caractères, 16 skins, compteurs au maximum. */
export function maximalProgress(): ProgressData {
  const maximal = defaultProgress();
  for (const mode of MODE_IDS) {
    maximal.records[mode] = Array.from({ length: LIMITS.recordsPerMode }, (_, index) => ({
      name: index % 2 === 0 ? '🐍'.repeat(12) : 'Éléonore-Zoé',
      score: 9999 - index,
      dateTime: '2026-11-01T10:00:00',
    }));
    maximal.counters.gamesByMode[mode] = LIMITS.counterMax;
  }
  maximal.counters.totalCandies = LIMITS.counterMax;
  maximal.lastName = 'Zoé'.repeat(4);
  maximal.skins.unlocked = SKINS.map((skin) => skin.id);
  return maximal;
}

export interface TrapFile {
  label: string;
  bytes: Uint8Array;
  /** E-01 pour tout refus, E-02 pour la version de format plus récente. */
  expected: 'invalid' | 'newer';
}

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

type Json = Record<string, unknown>;

/** Valeur désignée par le chemin dans un document lu du JSON. */
function at(document: unknown, path: readonly string[]): Json {
  let current = document;
  for (const key of path) current = (current as Json)[key];
  return current as Json;
}

/** Document du fichier valide, à abîmer. */
function documentOf(valid: string): Json {
  return JSON.parse(valid) as Json;
}

/** Fichier forgé : le contenu est abîmé, puis la somme de contrôle est recalculée sur ce contenu. */
async function forged(valid: string, change: (document: Json) => void): Promise<Uint8Array> {
  const document = documentOf(valid);
  change(document);
  const body = JSON.stringify({
    format: document['format'],
    formatVersion: document['formatVersion'],
    createdAt: document['createdAt'],
    data: document['data'],
  });
  document['checksum'] = await sha256Hex(body);
  return encode(JSON.stringify(document));
}

function manyRecords(count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `Joueur ${index}`,
    score: 9999 - index,
    dateTime: '2026-10-31T18:00:00',
  }));
}

/** Fichier valide créé par le jeu, de la progression donnée. */
export async function validBackup(
  progress: ProgressData = sampleProgress(),
  createdAt: string = BACKUP_CREATED_AT,
): Promise<string> {
  return serializeEnvelope(progress, createdAt);
}

/** Fichier valide complété d'espaces jusqu'à la taille donnée. */
export function paddedTo(valid: string, bytes: number): Uint8Array {
  return encode(valid + ' '.repeat(bytes - encode(valid).length));
}

/** Tous les fichiers que le jeu doit refuser, avec le code d'erreur attendu. */
export async function trapCorpus(): Promise<TrapFile[]> {
  const valid = await validBackup();
  const insertInData = (entry: string): Uint8Array =>
    encode(valid.replace('"data":{', `"data":{${entry},`));
  const files: TrapFile[] = [];
  const add = (
    label: string,
    bytes: Uint8Array | string,
    expected: TrapFile['expected'] = 'invalid',
  ) => {
    files.push({ label, bytes: typeof bytes === 'string' ? encode(bytes) : bytes, expected });
  };

  add('un fichier vide', '');
  add('un fichier de 10 Mo', new Uint8Array(10 * 1024 * 1024).fill(0x20));
  const random = createRandom(11);
  add(
    'un fichier binaire',
    Uint8Array.from({ length: 4096 }, () => random.nextInt(256)),
  );
  add(
    'une image (PNG)',
    Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
    ]),
  );
  add(
    'le JSON d’une autre application',
    '{"name":"autre-appli","version":"2.4.1","settings":{"theme":"clair"},"items":[1,2,3]}',
  );
  add('un JSON tronqué', valid.slice(0, Math.floor(valid.length / 2)));
  add('un JSON suivi de caractères en trop', `${valid}}`);
  add(
    'une somme de contrôle fausse',
    valid.replace(/([0-9a-f])"\}$/, (_, last: string) => `${last === '0' ? '1' : '0'}"}`),
  );
  add(
    'un caractère modifié dans les données (somme non recalculée)',
    valid.replace('"score":42', '"score":43'),
  );
  add('un nom modifié dans les données (somme non recalculée)', valid.replace('Joueur', 'Jouaur'));

  add(
    'une version de format future (E-02)',
    await forged(valid, (document) => (document['formatVersion'] = SAVE_FORMAT.version + 1)),
    'newer',
  );
  add(
    'une version de format très supérieure (E-02)',
    await forged(valid, (document) => (document['formatVersion'] = 99)),
    'newer',
  );
  add(
    'un format d’un autre jeu',
    await forged(valid, (document) => (document['format'] = 'autre-jeu')),
  );
  add(
    'une version de format nulle',
    await forged(valid, (document) => (document['formatVersion'] = 0)),
  );
  add(
    'une version de format décimale',
    await forged(valid, (document) => (document['formatVersion'] = 1.5)),
  );
  add('un champ inconnu à la racine', await forged(valid, (d) => (d['extra'] = 1)));
  add(
    'un champ inconnu dans les données',
    await forged(valid, (d) => (at(d, ['data'])['extra'] = 1)),
  );
  add(
    'un champ inconnu dans un record',
    await forged(valid, (d) => {
      const table = at(d, ['data', 'records'])['classic'] as Json[];
      (table[0] as Json)['extra'] = true;
    }),
  );
  add('un champ manquant', await forged(valid, (d) => delete at(d, ['data'])['lastName']));

  add('la clé __proto__ dans les données', insertInData('"__proto__":{"polluted":true}'));
  add(
    'la clé constructor dans les données',
    insertInData('"constructor":{"prototype":{"polluted":true}}'),
  );
  add('la clé prototype dans les données', insertInData('"prototype":{"polluted":true}'));
  add(
    'la clé __proto__ à la racine',
    valid.replace('{"format"', '{"__proto__":{"polluted":true},"format"'),
  );

  const score = (value: unknown) => async () =>
    forged(valid, (d) => {
      ((at(d, ['data', 'records'])['classic'] as Json[])[0] as Json)['score'] = value;
    });
  add('un score négatif', await score(-1)());
  add('un score nul', await score(0)());
  add('un score décimal', await score(1.5)());
  add('un score de 1e308', await score(1e308)());
  add('un score nul (null)', await score(null)());
  add('un score en texte', await score('42')());
  add('un score trop grand', await score(10_000)());
  add('un score NaN (jeton non JSON)', valid.replace('"score":42', '"score":NaN'));
  add('un score Infinity (jeton non JSON)', valid.replace('"score":42', '"score":Infinity'));
  add(
    'un compteur négatif',
    await forged(valid, (d) => (at(d, ['data', 'counters'])['totalCandies'] = -5)),
  );
  add(
    'un compteur décimal',
    await forged(valid, (d) => (at(d, ['data', 'counters'])['totalCandies'] = 2.5)),
  );
  add(
    'un compteur au-delà de la borne',
    await forged(
      valid,
      (d) => (at(d, ['data', 'counters'])['totalCandies'] = LIMITS.counterMax + 1),
    ),
  );

  add(
    '1 000 records',
    await forged(valid, (d) => (at(d, ['data', 'records'])['classic'] = manyRecords(1000))),
  );
  add(
    '11 records dans un mode',
    await forged(valid, (d) => (at(d, ['data', 'records'])['classic'] = manyRecords(11))),
  );
  const named = (name: string) => async () =>
    forged(valid, (d) => {
      ((at(d, ['data', 'records'])['classic'] as Json[])[0] as Json)['name'] = name;
    });
  add('un nom de 10 000 caractères', await named('A'.repeat(10_000))());
  add('un nom de 13 caractères', await named('A'.repeat(13))());
  add('un nom vide', await named('')());
  add('un nom avec U+202E', await named('Jo‮ueur')());
  add('un nom avec U+200F', await named('Jo‏ueur')());
  add('un nom avec U+200E', await named('Jo‎ueur')());
  add('un nom avec U+061C', await named('Jo؜ueur')());
  add('un nom avec U+2066', await named('Jo⁦ueur')());
  add('un nom avec un caractère de contrôle', await named('Jo\u0007ueur')());
  add('un nom avec un retour à la ligne', await named('Jo\nueur')());
  add('un nom avec espaces de bord', await named(' Joueur ')());
  add('un nom qui n’est pas du texte', await named(42 as unknown as string)());
  add('un nom avec un substitut isolé', valid.replace('"name":"Joueur"', '"name":"Jo\\ud800ueur"'));

  add(
    'un skin inconnu',
    await forged(valid, (d) =>
      (at(d, ['data', 'skins'])['unlocked'] as unknown[]).push('shape-inconnu'),
    ),
  );
  add(
    'un skin choisi non débloqué',
    await forged(valid, (d) => (at(d, ['data', 'skins', 'selected'])['shape'] = 'shape-saucer')),
  );
  add(
    'un skin par défaut retiré',
    await forged(valid, (d) => (at(d, ['data', 'skins'])['unlocked'] as unknown[]).shift()),
  );
  add(
    'un mode inconnu',
    await forged(valid, (d) => {
      const records = at(d, ['data', 'records']);
      records['turbo'] = records['zen'];
    }),
  );
  add(
    'un réglage hors liste',
    await forged(valid, (d) => (at(d, ['data', 'settings'])['control'] = 'souris')),
  );
  add(
    'un réglage booléen en texte',
    await forged(valid, (d) => (at(d, ['data', 'settings'])['sounds'] = 'oui')),
  );
  add(
    'une date de record dans le futur',
    await forged(valid, (d) => {
      ((at(d, ['data', 'records'])['classic'] as Json[])[0] as Json)['dateTime'] =
        '2031-01-01T00:00:00';
    }),
  );
  add(
    'une date de création dans le futur',
    await forged(valid, (d) => (d['createdAt'] = '2031-01-01T00:00:00')),
  );
  add('une date impossible', await forged(valid, (d) => (d['createdAt'] = '2026-02-31T10:00:00')));
  add(
    'des records en désordre',
    await forged(valid, (d) => {
      const table = at(d, ['data', 'records'])['classic'] as Json[];
      table.push({ name: 'Zoé', score: 50, dateTime: '2026-10-31T18:00:00' });
    }),
  );

  add('100 000 crochets imbriqués', '['.repeat(100_000));
  add('100 000 crochets imbriqués et refermés', '['.repeat(100_000) + ']'.repeat(100_000));
  add('100 000 objets imbriqués', '{"a":'.repeat(100_000));
  add(
    'records sous forme de tableau',
    await forged(valid, (d) => (at(d, ['data'])['records'] = [])),
  );
  add('data sous forme de tableau', await forged(valid, (d) => (d['data'] = [])));
  add('skins sous forme de tableau', await forged(valid, (d) => (at(d, ['data'])['skins'] = [])));
  add(
    'settings sous forme de tableau',
    await forged(valid, (d) => (at(d, ['data'])['settings'] = [])),
  );
  add(
    'un tableau de records remplacé par un objet',
    await forged(valid, (d) => (at(d, ['data', 'records'])['classic'] = {})),
  );
  add(
    'un fichier de 262 145 octets, par ailleurs valide',
    paddedTo(valid, LIMITS.importFileMaxBytes + 1),
  );
  add('un fichier de 600 Ko, par ailleurs valide', paddedTo(valid, 600 * 1024));
  return files;
}

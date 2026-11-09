import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyFinishedGame, defaultProgress } from '../../src/core/progress.ts';
import { createRandom } from '../../src/core/random.ts';
import { LIMITS, SAVE_FORMAT } from '../../src/core/rules.ts';
import { readEnvelope, serializeEnvelope, sha256Hex } from '../../src/core/savefile.ts';
import type { ProgressData } from '../../src/core/types.ts';

const NOW = new Date(2026, 10, 2, 12, 0, 0);
const CREATED = '2026-11-01T14:30:05';

function sample(): ProgressData {
  return applyFinishedGame(defaultProgress(), {
    mode: 'classic',
    score: 42,
    candiesEaten: 42,
    dateTime: '2026-11-01T14:02:11',
  }).progress;
}

describe('ct_118_validateur_complements : somme de contrôle et enveloppe (EXS-04)', () => {
  it('SHA-256 : vecteurs de référence', async () => {
    assert.equal(
      await sha256Hex('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    assert.equal(
      await sha256Hex(''),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('une enveloppe écrite est relue à l’identique', async () => {
    const text = await serializeEnvelope(sample(), CREATED);
    const envelope = await readEnvelope(text, NOW);
    assert.ok(envelope);
    assert.equal(envelope.format, SAVE_FORMAT.name);
    assert.equal(envelope.formatVersion, SAVE_FORMAT.version);
    assert.equal(envelope.createdAt, CREATED);
    assert.deepEqual(envelope.data, sample());
    assert.match(envelope.checksum, /^[0-9a-f]{64}$/);
  });

  it('les clés suivent l’ordre fixe du format, quel que soit l’ordre de l’objet d’origine', async () => {
    const reversed = JSON.parse(JSON.stringify(sample())) as Record<string, unknown>;
    const entries = Object.entries(reversed).reverse();
    const shuffled = Object.fromEntries(entries) as unknown as ProgressData;
    assert.equal(
      await serializeEnvelope(shuffled, CREATED),
      await serializeEnvelope(sample(), CREATED),
    );
    const parsed = JSON.parse(await serializeEnvelope(sample(), CREATED)) as Record<
      string,
      unknown
    >;
    assert.deepEqual(Object.keys(parsed), [
      'format',
      'formatVersion',
      'createdAt',
      'data',
      'checksum',
    ]);
    assert.deepEqual(Object.keys(parsed['data'] as object), [
      'records',
      'lastName',
      'skins',
      'counters',
      'settings',
    ]);
  });

  it('la liste des skins débloqués suit l’ordre du catalogue dans la forme canonique', async () => {
    const progress = sample();
    progress.skins.unlocked = [...progress.skins.unlocked].reverse();
    const parsed = JSON.parse(await serializeEnvelope(progress, CREATED)) as {
      data: { skins: { unlocked: string[] } };
    };
    assert.deepEqual(parsed.data.skins.unlocked, [
      'shape-rings',
      'shape-comet',
      'pattern-plain',
      'pattern-dots',
      'trail-none',
      'decor-starry-night',
    ]);
  });

  const refusals: [string, (text: string) => string][] = [
    ['texte vide', () => ''],
    ['JSON tronqué', (text) => text.slice(0, text.length - 20)],
    ['un caractère modifié dans une valeur', (text) => text.replace('"score":42', '"score":43')],
    ['une somme fausse', (text) => text.replace(/"checksum":"[0-9a-f]/, '"checksum":"0')],
    [
      'une version de format plus récente',
      (text) => text.replace('"formatVersion":1', '"formatVersion":2'),
    ],
    [
      'une version de format nulle',
      (text) => text.replace('"formatVersion":1', '"formatVersion":0'),
    ],
    ['un format inconnu', (text) => text.replace(SAVE_FORMAT.name, 'autre-jeu')],
    ['un champ en plus', (text) => text.replace('{"format"', '{"extra":1,"format"')],
    ['la clé __proto__', (text) => text.replace('{"format"', '{"__proto__":{"x":1},"format"')],
    ['un tableau', () => '[]'],
    ['null', () => 'null'],
    ['un nombre', () => '42'],
    ['100 000 crochets imbriqués', () => '['.repeat(100_000)],
    ['100 000 crochets imbriqués fermés', () => '['.repeat(100_000) + ']'.repeat(100_000)],
    ['des objets imbriqués', () => '{"a":'.repeat(100_000)],
    [
      'un fichier de 262 145 octets',
      (text) => text + ' '.repeat(LIMITS.importFileMaxBytes + 1 - text.length),
    ],
  ];
  for (const [label, change] of refusals) {
    it(`refuse ${label}, sans exception`, async () => {
      const text = await serializeEnvelope(sample(), CREATED);
      assert.equal(await readEnvelope(change(text), NOW), null);
    });
  }

  it('data sous forme de tableau est refusé même avec une somme recalculée', async () => {
    const text = await serializeEnvelope(sample(), CREATED);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    parsed['data'] = [];
    const body = JSON.stringify({
      format: parsed['format'],
      formatVersion: parsed['formatVersion'],
      createdAt: parsed['createdAt'],
      data: [],
    });
    parsed['checksum'] = await sha256Hex(body);
    assert.equal(await readEnvelope(JSON.stringify(parsed), NOW), null);
  });

  it('un fichier valide complété d’espaces jusqu’à 262 144 octets est accepté', async () => {
    const text = await serializeEnvelope(sample(), CREATED);
    const padded = text + ' '.repeat(LIMITS.importFileMaxBytes - text.length);
    assert.equal(padded.length, LIMITS.importFileMaxBytes);
    assert.ok(await readEnvelope(padded, NOW));
  });

  it('ct_125_controle_des_dates : une date de création dans le futur ou impossible est refusée', async () => {
    for (const createdAt of ['2026-11-04T10:00:00', '2026-02-31T10:00:00', 'hier']) {
      const text = await serializeEnvelope(sample(), createdAt);
      assert.equal(await readEnvelope(text, NOW), null, createdAt);
    }
  });

  it('ct_125_controle_des_dates : HYP-49, une enveloppe locale datée du futur est lue ; le contrôle strict reste pour le fichier importé', async () => {
    const text = await serializeEnvelope(sample(), '2031-01-01T00:00:00');
    assert.equal(await readEnvelope(text, NOW), null);
    assert.ok(await readEnvelope(text, NOW, true));
  });

  it('300 mutations aléatoires reproductibles : aucune exception, aucune acceptée si la donnée change', async () => {
    const original = sample();
    const text = await serializeEnvelope(original, CREATED);
    const random = createRandom(2026);
    let accepted = 0;
    for (let index = 0; index < 300; index += 1) {
      const chars = [...text];
      const position = random.nextInt(chars.length);
      const kind = random.nextInt(3);
      if (kind === 0) chars[position] = String.fromCharCode(32 + random.nextInt(95));
      else if (kind === 1) chars.splice(position, 1);
      else chars.splice(position, 0, String.fromCharCode(32 + random.nextInt(95)));
      const envelope = await readEnvelope(chars.join(''), NOW);
      if (envelope === null) continue;
      accepted += 1;
      assert.deepEqual(envelope.data, original, 'une donnée modifiée a été acceptée');
    }
    assert.ok(accepted < 300);
  });
});

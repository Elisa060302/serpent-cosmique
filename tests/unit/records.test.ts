import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanName, insertRecord, renameRecord, sanitizeTyping } from '../../src/core/records.ts';
import { DEFAULT_NAME, LIMITS } from '../../src/core/rules.ts';
import type { RecordEntry } from '../../src/core/types.ts';

function entry(name: string, score: number, day = 1): RecordEntry {
  return { name, score, dateTime: `2026-10-${String(day).padStart(2, '0')}T10:00:00` };
}

function fullTable(): RecordEntry[] {
  // Scores 24 à 15 : le 10e vaut 15.
  return Array.from({ length: 10 }, (_, index) => entry(`J${index + 1}`, 24 - index));
}

describe('ct_38_entree_au_tableau : égalité avec le 10e, zéro point (RG-48)', () => {
  it('un score égal au 10e n’entre pas, le tableau ne change pas', () => {
    const table = fullTable();
    const result = insertRecord(table, entry('Léa', 15, 2));
    assert.equal(result.rank, null);
    assert.deepEqual(result.table, table);
  });

  it('un score supérieur au 10e entre et l’ancien 10e sort', () => {
    const result = insertRecord(fullTable(), entry('Léa', 16, 2));
    assert.equal(result.rank, 10);
    assert.equal(result.table.length, LIMITS.recordsPerMode);
    assert.equal(result.table[9]?.name, 'Léa');
    assert.deepEqual(
      result.table.map((record) => record.score),
      [24, 23, 22, 21, 20, 19, 18, 17, 16, 16],
    );
    assert.equal(
      result.table.some((record) => record.name === 'J10'),
      false,
    );
  });

  it('un score de 0 n’entre jamais, même dans un tableau vide', () => {
    const result = insertRecord([], entry('Léa', 0));
    assert.equal(result.rank, null);
    assert.deepEqual(result.table, []);
  });

  it('un tableau de moins de 10 records accepte tout score d’au moins 1', () => {
    const result = insertRecord([entry('Coco', 11)], entry('Léa', 1, 2));
    assert.equal(result.rank, 2);
  });

  it('le tableau d’origine n’est pas modifié', () => {
    const table = fullTable();
    const copy = structuredClone(table);
    insertRecord(table, entry('Léa', 30, 2));
    assert.deepEqual(table, copy);
  });
});

describe('ct_37_tableaux_records : tri décroissant, le plus ancien d’abord à égalité (RG-47)', () => {
  it('trie par score décroissant', () => {
    const first = insertRecord([], entry('A', 5)).table;
    const second = insertRecord(first, entry('B', 9, 2)).table;
    const third = insertRecord(second, entry('C', 7, 3)).table;
    assert.deepEqual(
      third.map((record) => record.name),
      ['B', 'C', 'A'],
    );
  });

  it('à score égal, le record le plus ancien est placé avant', () => {
    const table = [entry('Ancien', 7), entry('Autre', 3)];
    const result = insertRecord(table, entry('Récent', 7, 2));
    assert.equal(result.rank, 2);
    assert.deepEqual(
      result.table.map((record) => record.name),
      ['Ancien', 'Récent', 'Autre'],
    );
  });
});

describe('ct_39_saisie_du_nom : nettoyage du nom (RG-51)', () => {
  it('retire les espaces de début et de fin, les retours à la ligne et les caractères de contrôle', () => {
    assert.equal(cleanName('  Léa  '), 'Léa');
    assert.equal(cleanName('Lé\na\r\n'), 'Léa');
    assert.equal(cleanName('Co\u0000co\u0007\t'), 'Coco');
    assert.equal(cleanName('\u0085Léa\u009f'), 'Léa');
  });

  it('un nom vide ou fait d’espaces devient « Joueur »', () => {
    assert.equal(cleanName(''), DEFAULT_NAME);
    assert.equal(cleanName('   \n '), DEFAULT_NAME);
    assert.equal(cleanName('\u202e\u200f'), DEFAULT_NAME);
  });

  it('accepte lettres accentuées, chiffres, ponctuation et emojis', () => {
    assert.equal(cleanName('Zoé-42 !'), 'Zoé-42 !');
    assert.equal(cleanName('🐍🍬'), '🐍🍬');
  });

  it('un emoji ou une lettre accentuée compte pour un caractère : 12 au plus', () => {
    assert.equal(cleanName('🐍'.repeat(12)), '🐍'.repeat(12));
    assert.equal(cleanName('🐍'.repeat(13)), '🐍'.repeat(12));
    assert.equal(cleanName('é'.repeat(20)), 'é'.repeat(12));
    // Emoji composé avec le liant U+200D : un seul caractère.
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
    assert.equal(cleanName(family.repeat(12)), family.repeat(12));
    assert.equal(cleanName(family.repeat(13)), family.repeat(12));
  });

  it('le 13e caractère est refusé : <script>Coco reste intact, le reste est coupé', () => {
    assert.equal(cleanName('<script>Coco'), '<script>Coco');
    assert.equal(cleanName('<script>Cocox'), '<script>Coco');
    assert.equal(cleanName('<img src=x onerror=alert(1)>'), '<img src=x o');
  });

  it('retire les marques bidirectionnelles et les substituts isolés (même prédicat que le validateur)', () => {
    for (const forbidden of ['\u202e', '\u200f', '\u200e', '\u061c', '\u2066', '\u2069']) {
      assert.equal(cleanName(`Co${forbidden}co`), 'Coco');
    }
    assert.equal(cleanName('Co\ud800co'), 'Coco');
    assert.equal(cleanName('Co\udc00co'), 'Coco');
  });

  it('la saisie garde les espaces (on tape « Jean Paul » lettre à lettre) mais coupe à 12', () => {
    assert.equal(sanitizeTyping('Jean '), 'Jean ');
    assert.equal(sanitizeTyping('a\nb\u202e'), 'ab');
    assert.equal(sanitizeTyping('x'.repeat(13)), 'x'.repeat(12));
  });
});

describe('ct_39_saisie_du_nom : le nom validé remplace le nom enregistré (RG-53)', () => {
  it('remplace le nom du record de ce rang, sans toucher au reste', () => {
    const table = [entry('Coco', 11), entry('Joueur', 9, 2)];
    const renamed = renameRecord(table, 2, 'Léa');
    assert.deepEqual(
      renamed.map((record) => record.name),
      ['Coco', 'Léa'],
    );
    assert.equal(renamed[1]?.score, 9);
    assert.equal(table[1]?.name, 'Joueur');
  });

  it('un rang hors du tableau est refusé', () => {
    assert.throws(() => renameRecord([entry('Coco', 11)], 2, 'Léa'), RangeError);
  });
});

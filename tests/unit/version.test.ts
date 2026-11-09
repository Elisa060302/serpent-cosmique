import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { VERSION, isNewerVersion, isVersion } from '../../src/core/version.ts';

describe('ct_103_version : numéro MAJEUR.MINEUR.CORRECTIF (ENF-18)', () => {
  it('accepte trois entiers séparés par des points, rien d’autre', () => {
    for (const text of ['1.0.0', '0.0.0', '12.345.6789']) assert.equal(isVersion(text), true, text);
    for (const text of [
      '',
      '1',
      '1.0',
      '1.0.0.0',
      '01.0.0',
      '1.0.0-beta',
      ' 1.0.0',
      '1.0.0\n',
      'a.b.c',
      '1.0.<script>',
      '99999.0.0',
      '1.2.-3',
    ]) {
      assert.equal(isVersion(text), false, JSON.stringify(text));
    }
  });

  it('compare numériquement, pas comme du texte', () => {
    assert.equal(isNewerVersion('1.1.0', '1.0.0'), true);
    assert.equal(isNewerVersion('1.0.1', '1.0.0'), true);
    assert.equal(isNewerVersion('2.0.0', '1.99.99'), true);
    assert.equal(isNewerVersion('1.10.0', '1.9.0'), true);
    assert.equal(isNewerVersion('1.0.0', '1.0.0'), false);
    assert.equal(isNewerVersion('1.0.0', '1.1.0'), false);
    assert.equal(isNewerVersion('1.9.0', '1.10.0'), false);
  });

  it('la version du jeu au format attendu ; le fichier source porte la valeur à remplacer par la construction', () => {
    assert.equal(isVersion(VERSION), true);
    assert.match(
      readFileSync('src/core/version.ts', 'utf8'),
      /^export const VERSION = '[^']*';$/m,
      'la construction remplace cette ligne par la version de package.json',
    );
  });
});

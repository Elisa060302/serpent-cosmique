import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('EXS-06 : construction du DOM', () => {
  it('aucun écran ne crée d’élément hors de ui/dom.ts (liste fermée d’attributs, textContent)', () => {
    const directory = 'src/ui/screens';
    const offenders = readdirSync(directory)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) =>
        /document\.createElement/.test(readFileSync(`${directory}/${name}`, 'utf8')),
      );
    assert.deepEqual(offenders, []);
  });
});

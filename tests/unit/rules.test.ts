import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  AUDIO,
  CANDY_COLORS,
  ERROR_TOAST_MS,
  GRID,
  LIMITS,
  MODE_IDS,
  PX_PER_MM,
  RAINBOW_COLORS,
  SIZES_MM,
  SOUND_EVENTS,
  START,
  TOAST_MS,
  VIBRATION_MS,
} from '../../src/core/rules.ts';

function listSources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? listSources(path) : [path];
  });
}

describe('ct_90_graine_et_regles : valeurs centralisées', () => {
  it('la grille fait 24 colonnes sur 12 lignes', () => {
    assert.deepEqual({ ...GRID }, { columns: 24, rows: 12 });
  });

  it('le serpent de départ est en colonne 6, ligne 6, avec 4 cases, dans la grille', () => {
    assert.equal(START.headColumn, 6);
    assert.equal(START.headRow, 6);
    assert.equal(START.length, 4);
    assert.ok(START.headColumn - (START.length - 1) >= 1, 'la queue sort de la grille');
  });

  it('les 7 modes ont leurs identifiants, dans l’ordre de la liste', () => {
    assert.deepEqual(
      [...MODE_IDS],
      ['classic', 'time-attack', 'asteroids', 'black-hole', 'bonus-traps', 'zen', 'constellation'],
    );
  });

  it('les bonbons ont quatre couleurs et quatre silhouettes toutes différentes', () => {
    assert.deepEqual(
      CANDY_COLORS.map((color) => color.id),
      ['pink', 'purple', 'light-pink', 'light-blue'],
    );
    assert.equal(new Set(CANDY_COLORS.map((color) => color.hex)).size, 4);
    assert.equal(new Set(CANDY_COLORS.map((color) => color.silhouette)).size, 4);
    for (const color of CANDY_COLORS) {
      assert.match(color.hex, /^#[0-9A-F]{6}$/);
    }
  });

  it('l’arc-en-ciel compte au moins 5 couleurs différentes', () => {
    assert.ok(new Set(RAINBOW_COLORS).size >= 5);
  });

  it('les limites du dictionnaire sont celles de la spécification', () => {
    assert.equal(LIMITS.recordsPerMode, 10);
    assert.equal(LIMITS.scoreMin, 1);
    assert.equal(LIMITS.scoreMax, 9999);
    assert.equal(LIMITS.nameMaxGraphemes, 12);
    assert.equal(LIMITS.counterMax, 1_000_000_000);
    assert.equal(LIMITS.candiesEatenMax, 9999);
    assert.equal(LIMITS.importFileMaxBytes, 262_144);
    assert.equal(LIMITS.earliestDate, '2026-01-01');
    assert.equal(LIMITS.futureToleranceHours, 24);
  });

  it('la conversion millimètres → pixels CSS et les seuils tactiles', () => {
    assert.equal(PX_PER_MM, 6.3);
    assert.deepEqual({ ...SIZES_MM }, { swipe: 5, arrow: 12, pauseButton: 9 });
  });

  it('la feuille de style utilise la même conversion millimètres → pixels que rules.ts', () => {
    const match = /--mm:\s*([0-9.]+)px/.exec(readFileSync('public/styles.css', 'utf8'));
    assert.equal(Number(match?.[1]), PX_PER_MM);
  });

  it('le message passager d’erreur dure 8 s, les autres 6 s', () => {
    assert.equal(TOAST_MS, 6000);
    assert.equal(ERROR_TOAST_MS, 8000);
  });

  it('la feuille de style respecte la zone sûre du bas pour le message passager et 16 px pour les flèches', () => {
    const css = readFileSync('public/styles.css', 'utf8');
    const toast = /\n\.toast \{[^}]*\}/.exec(css)?.[0] ?? '';
    assert.match(toast, /bottom:\s*calc\(var\(--gap\) \+ env\(safe-area-inset-bottom\)\)/);
    const arrow = /\n\.arrow \{[^}]*\}/.exec(css)?.[0] ?? '';
    assert.match(arrow, /font-size:\s*max\(16px,/);
  });

  it('aucune couleur n’est écrite en dur ailleurs que dans rules.ts', () => {
    const offenders = listSources('src').filter(
      (path) => !path.endsWith('rules.ts') && /#[0-9a-fA-F]{6}\b/.test(readFileSync(path, 'utf8')),
    );
    assert.deepEqual(offenders, []);
  });
});

describe('ct_48_sons_et_vibrations : valeurs des sons et des vibrations (RG-66)', () => {
  it('300 ms à une collision, 80 ms au bonbon spécial', () => {
    assert.deepEqual({ ...VIBRATION_MS }, { collision: 300, special: 80 });
  });

  it('les six bruitages ont chacun leurs notes, et ils diffèrent les uns des autres', () => {
    assert.deepEqual(
      [...SOUND_EVENTS],
      ['candy', 'special', 'constellation', 'end', 'record', 'unlock'],
    );
    const melodies = SOUND_EVENTS.map((event) => JSON.stringify(AUDIO.sfx[event]));
    assert.equal(new Set(melodies).size, SOUND_EVENTS.length);
    for (const event of SOUND_EVENTS) {
      assert.ok(AUDIO.sfx[event].length > 0, event);
      for (const note of AUDIO.sfx[event]) {
        assert.ok(note.hz > 0 && note.at >= 0 && note.seconds > 0, event);
      }
    }
  });

  it('la musique tient dans son cycle, avec une avance plus courte que le cycle, et une onde distincte des bruitages', () => {
    const last = AUDIO.music.notes.at(-1);
    assert.ok(last !== undefined && last.at + last.seconds <= AUDIO.music.cycleSeconds);
    assert.ok(AUDIO.music.leadSeconds > 0 && AUDIO.music.leadSeconds < AUDIO.music.cycleSeconds);
    assert.notEqual(AUDIO.musicWave, AUDIO.sfxWave);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatDate, formatLocalDateTime, formatNumber, rankLabel } from '../../src/core/format.ts';

describe('ct_106_textes_de_reference : formats français (ENF-13)', () => {
  it('la date s’affiche JJ/MM/AAAA', () => {
    assert.equal(formatDate('2026-11-01T14:02:11'), '01/11/2026');
    assert.equal(formatDate('2027-01-09T00:00:00'), '09/01/2027');
  });

  it('l’heure locale est écrite AAAA-MM-JJTHH:MM:SS, avec des zéros', () => {
    assert.equal(formatLocalDateTime(new Date(2026, 10, 1, 9, 5, 3)), '2026-11-01T09:05:03');
    assert.equal(formatLocalDateTime(new Date(2026, 11, 31, 23, 59, 59)), '2026-12-31T23:59:59');
  });

  it('les nombres ont une espace insécable pour les milliers', () => {
    assert.equal(formatNumber(0), '0');
    assert.equal(formatNumber(999), '999');
    assert.equal(formatNumber(1000), '1\u00a0000');
    assert.equal(formatNumber(1_000_000_000), '1\u00a0000\u00a0000\u00a0000');
  });

  it('le rang s’écrit 1er, 2e, 3e…', () => {
    assert.equal(rankLabel(1), '1er');
    assert.equal(rankLabel(2), '2e');
    assert.equal(rankLabel(10), '10e');
  });
});

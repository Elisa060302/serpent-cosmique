import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { EXCEPTIONS, blockingAdvisories } from '../../scripts/audit.mjs';

const PICOMATCH = {
  source: 1247710,
  name: 'picomatch',
  title: 'picomatch vulnerable to ReDoS through single-branch repeated extglobs',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
  severity: 'high',
  range: '<=4.0.7',
};

/** Rapport de `npm audit --json` réduit à ce que lit le script. */
function report(...advisories: object[]): object {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      ...Object.fromEntries(
        advisories.map((advisory) => [
          (advisory as { name: string }).name,
          { name: (advisory as { name: string }).name, via: [advisory] },
        ]),
      ),
      // Paquet touché par dépendance : l'avis est compté une fois, à sa source.
      tinyglobby: { name: 'tinyglobby', via: ['picomatch'] },
    },
  };
}

const BEFORE = new Date('2026-11-24T23:59:59Z');
const AFTER = new Date('2026-11-25T00:00:00Z');

describe('audit des dépendances : exception datée (GHSA-fc5q-39xc-vjpf)', () => {
  it('une seule exception, pour cet avis seulement, jusqu’au 25 novembre 2026 (exclu), avec sa raison', () => {
    assert.equal(EXCEPTIONS.length, 1);
    const [exception] = EXCEPTIONS;
    assert.equal(exception?.id, 'GHSA-fc5q-39xc-vjpf');
    assert.equal(exception?.until, '2026-11-25T00:00:00Z');
    assert.match(exception?.reason ?? '', /picomatch <=4\.0\.7/);
    assert.match(exception?.reason ?? '', /eslint\.config\.js/);
  });

  it('la même date limite que l’exception d’osv-scanner', () => {
    const toml = readFileSync('osv-scanner.toml', 'utf8');
    assert.equal(toml.match(/^\[\[IgnoredVulns\]\]$/gm)?.length, 1);
    assert.match(toml, /^id = "GHSA-fc5q-39xc-vjpf"$/m);
    assert.match(toml, /^ignoreUntil = 2026-11-25$/m);
  });

  it('l’intégration continue passe par ce script et donne la même exception à osv-scanner', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    assert.match(workflow, /^ {8}run: node scripts\/audit\.mjs$/m);
    assert.doesNotMatch(workflow, /run: npm audit/);
    assert.match(
      workflow,
      /scan-args: \|-\n {8}--lockfile=package-lock\.json\n {8}--config=osv-scanner\.toml\n/,
    );
  });

  it('avant la date, l’avis excepté ne bloque pas', () => {
    assert.deepEqual(blockingAdvisories(report(PICOMATCH), BEFORE), []);
  });

  it('à la date, l’exception tombe d’elle-même et l’avis bloque', () => {
    assert.equal(blockingAdvisories(report(PICOMATCH), AFTER).length, 1);
    assert.match(blockingAdvisories(report(PICOMATCH), AFTER)[0] ?? '', /GHSA-fc5q-39xc-vjpf/);
  });

  it('tout autre avis bloque, même pendant l’exception', () => {
    const other = {
      ...PICOMATCH,
      name: 'minimatch',
      url: 'https://github.com/advisories/GHSA-aaaa-bbbb-cccc',
    };
    assert.deepEqual(blockingAdvisories(report(PICOMATCH, other), BEFORE), [
      'GHSA-aaaa-bbbb-cccc (minimatch <=4.0.7, high) : picomatch vulnerable to ReDoS through single-branch repeated extglobs',
    ]);
  });

  it('un avis sans identifiant GHSA bloque', () => {
    const unnamed = { ...PICOMATCH, name: 'autre', url: '' };
    assert.equal(blockingAdvisories(report(unnamed), BEFORE).length, 1);
  });

  it('un rapport en erreur ou illisible fait échouer l’audit', () => {
    assert.throws(() => blockingAdvisories({ error: { code: 'ENOTFOUND' } }, BEFORE));
    assert.throws(() => blockingAdvisories({}, BEFORE));
  });

  it('aucun avis : rien ne bloque', () => {
    assert.deepEqual(blockingAdvisories({ auditReportVersion: 2, vulnerabilities: {} }, AFTER), []);
  });
});

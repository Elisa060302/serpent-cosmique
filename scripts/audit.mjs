// Audit des dépendances pour l'intégration continue : lit `npm audit --json` et échoue sur tout avis, sauf les
// exceptions datées ci-dessous. À sa date, une exception tombe d'elle-même et l'avis bloque de nouveau.
// Les exceptions et leur réexamen sont décrits dans docs/guide-exploitation.md (« Exceptions d'audit »).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** Exceptions acceptées : identifiant de l'avis, fin de validité (instant exclu, UTC) et raison. */
export const EXCEPTIONS = [
  {
    id: 'GHSA-fc5q-39xc-vjpf',
    until: '2026-11-25T00:00:00Z',
    reason:
      'picomatch <=4.0.7 (ReDoS), aucune version corrigée publiée ; utilisé seulement en développement, par ' +
      'typescript-eslint, sur les motifs fixes de eslint.config.js ; absent du site publié.',
  },
];

const GHSA = /GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/;

/**
 * Avis du rapport qui bloquent à l'instant `now` : tout avis qui n'est pas couvert par une exception encore valide.
 * Un rapport en erreur ou sans liste de vulnérabilités lève une erreur : l'audit n'a pas eu lieu.
 */
export function blockingAdvisories(report, now = new Date(), exceptions = EXCEPTIONS) {
  if (
    report.error !== undefined ||
    typeof report.vulnerabilities !== 'object' ||
    report.vulnerabilities === null
  ) {
    throw new Error('Rapport de npm audit en erreur ou illisible.');
  }
  const allowed = new Set(
    exceptions.filter((entry) => now < new Date(entry.until)).map((entry) => entry.id),
  );
  const blocking = new Map();
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    for (const via of vulnerability.via ?? []) {
      // Une chaîne désigne un paquet vulnérable par dépendance : son avis est compté à la source.
      if (typeof via !== 'object' || via === null) continue;
      const id = GHSA.exec(via.url ?? '')?.[0] ?? `avis ${via.source ?? via.name ?? 'inconnu'}`;
      if (allowed.has(id)) continue;
      blocking.set(
        id,
        `${id} (${via.name} ${via.range ?? ''}, ${via.severity ?? ''}) : ${via.title ?? ''}`,
      );
    }
  }
  return [...blocking.values()];
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let output;
  try {
    output = execFileSync('npm', ['audit', '--json'], { encoding: 'utf8' });
  } catch (error) {
    // npm audit sort en erreur dès qu'il trouve un avis : son rapport reste sur la sortie standard.
    output = error.stdout ?? '';
  }
  let blocking;
  try {
    blocking = blockingAdvisories(JSON.parse(output));
  } catch {
    process.stderr.write('Audit impossible : rapport de npm audit en erreur ou illisible.\n');
    process.exit(1);
  }
  const now = new Date();
  for (const entry of EXCEPTIONS.filter((item) => now < new Date(item.until))) {
    process.stdout.write(
      `Exception active jusqu'au ${entry.until} (exclu) : ${entry.id}. ${entry.reason}\n`,
    );
  }
  if (blocking.length > 0) {
    process.stderr.write(`Avis bloquants :\n${blocking.map((line) => `- ${line}`).join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write('Audit des dépendances : aucun avis bloquant.\n');
}

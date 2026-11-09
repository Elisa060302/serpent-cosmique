// Finalise un site construit : numéro de version, liste des fichiers avec leur empreinte SHA-256, contrôles.
// Le site doit contenir exactement les fichiers produits par src/ et public/ (plus sw.js) : tout fichier en trop
// ou manquant fait échouer la construction, de sorte que ce qui est publié est ce qui est pré-caché.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Taille maximale de sw.js en octets : le navigateur le télécharge à chaque vérification de version (ENF-09). */
export const SW_MAX_BYTES = 9000;

const VERSION_FORMAT = /^\d+\.\d+\.\d+$/;

function listFiles(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), `${relative}/`);
    return [relative];
  });
}

/** Fichiers attendus dans le site, hors sw.js : une sortie par source du jeu, une copie par fichier public. */
function expectedFiles(root) {
  const sources = listFiles(path.join(root, 'src'))
    .filter((file) => file.endsWith('.ts') && !file.startsWith('sw/'))
    .map((file) => file.replace(/\.ts$/, '.js'));
  return [...sources, ...listFiles(path.join(root, 'public'))].sort();
}

function replaceOnce(text, pattern, replacement, what) {
  const matches = text.match(new RegExp(pattern.source, `${pattern.flags}g`)) ?? [];
  if (matches.length !== 1) {
    throw new Error(`Construction impossible : ${what} introuvable ou en double.`);
  }
  return text.replace(pattern, () => replacement);
}

function stamp(file, pattern, replacement, what) {
  writeFileSync(file, replaceOnce(readFileSync(file, 'utf8'), pattern, replacement, what));
}

/**
 * @param {{ root: string, dir: string, version?: string }} options
 * @returns {{ version: string, files: number, swBytes: number }}
 */
export function finalizeSite({ root, dir, version }) {
  const wanted =
    version ?? JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (!VERSION_FORMAT.test(wanted)) {
    throw new Error(
      `Construction impossible : version « ${wanted} » au format MAJEUR.MINEUR.CORRECTIF attendu.`,
    );
  }

  const actual = listFiles(dir)
    .filter((file) => file !== 'sw.js')
    .sort();
  if (!listFiles(dir).includes('sw.js')) throw new Error('Construction impossible : sw.js absent.');
  const expected = expectedFiles(root);
  const extra = actual.filter((file) => !expected.includes(file));
  const missing = expected.filter((file) => !actual.includes(file));
  if (extra.length > 0 || missing.length > 0) {
    throw new Error(
      `Construction impossible : fichiers en trop (${extra.join(', ') || 'aucun'}), manquants (${missing.join(', ') || 'aucun'}).`,
    );
  }

  stamp(
    path.join(dir, 'core/version.js'),
    /^export const VERSION = '[^']*';$/m,
    `export const VERSION = '${wanted}';`,
    'la ligne de la version de core/version.js',
  );
  const lines = actual.map((file) => {
    const digest = createHash('sha256')
      .update(readFileSync(path.join(dir, file)))
      .digest('base64');
    return `${file} ${digest.replace(/=+$/, '')}`;
  });
  const worker = path.join(dir, 'sw.js');
  stamp(
    worker,
    /^const VERSION = '[^']*';$/m,
    `const VERSION = '${wanted}';`,
    'la version de sw.js',
  );
  stamp(
    worker,
    /^const FILES = (?:'[^']*'|"(?:[^"\\]|\\.)*");$/m,
    `const FILES = ${JSON.stringify(lines.join('\n'))};`,
    'la liste de sw.js',
  );

  const swBytes = statSync(worker).size;
  if (swBytes > SW_MAX_BYTES) {
    throw new Error(
      `Construction impossible : sw.js fait ${swBytes} octets (${SW_MAX_BYTES} au plus).`,
    );
  }
  return { version: wanted, files: actual.length, swBytes };
}

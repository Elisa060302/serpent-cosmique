// Construit le jeu dans dist/ : compilation de src/ et de l'agent de service par tsc, copie de public/,
// puis version et liste des fichiers avec leurs empreintes injectées dans le site (scripts/site.mjs).
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { finalizeSite } from './site.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const tsc = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
const dist = fileURLToPath(new URL('../dist', import.meta.url));

rmSync(dist, { recursive: true, force: true });
for (const project of ['tsconfig.json', 'tsconfig.sw.json']) {
  execFileSync(process.execPath, [tsc, '-p', project], { cwd: root, stdio: 'inherit' });
}
cpSync(fileURLToPath(new URL('../public', import.meta.url)), dist, { recursive: true });
const { version, files, swBytes } = finalizeSite({ root, dir: dist });
process.stdout.write(
  `Construction terminée : dist/ (version ${version}, ${files} fichiers, sw.js ${swBytes} octets)\n`,
);

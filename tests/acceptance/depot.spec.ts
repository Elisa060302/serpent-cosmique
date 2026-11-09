import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const directories: string[] = [];

test.afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function outputDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'serpent-version-'));
  directories.push(directory);
  return directory;
}

function listing(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? listing(join(directory, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`],
  );
}

test('ct_77_artefacts_de_version : archive, SHA256SUMS vérifiée et SBOM CycloneDX, rejeu à blanc des étapes de release.yml', () => {
  const output = outputDirectory();
  execFileSync('sh', ['scripts/release-files.sh', '1.0.0', output], { stdio: 'pipe' });
  expect(readdirSync(output).sort()).toEqual([
    'SHA256SUMS',
    'serpent-cosmique-1.0.0.cdx.json',
    'serpent-cosmique-1.0.0.zip',
  ]);

  // Les sommes sont celles de l'archive et de la SBOM, et se vérifient avec sha256sum -c.
  const sums = readFileSync(join(output, 'SHA256SUMS'), 'utf8');
  expect(sums).toMatch(/^[0-9a-f]{64} {2}serpent-cosmique-1\.0\.0\.zip$/m);
  expect(sums).toMatch(/^[0-9a-f]{64} {2}serpent-cosmique-1\.0\.0\.cdx\.json$/m);
  execFileSync('sha256sum', ['--check', 'SHA256SUMS'], { cwd: output, stdio: 'pipe' });

  // L'archive contient le site complet (les fichiers de dist/, sw.js compris), sans sous-dossier parasite.
  const names = execFileSync('unzip', ['-Z1', join(output, 'serpent-cosmique-1.0.0.zip')], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter((name) => name !== '' && !name.endsWith('/'))
    .sort();
  expect(names).toEqual(listing('dist').sort());
  expect(names).toContain('sw.js');

  // La SBOM est un document CycloneDX.
  const sbom = JSON.parse(
    readFileSync(join(output, 'serpent-cosmique-1.0.0.cdx.json'), 'utf8'),
  ) as {
    bomFormat: string;
    specVersion: string;
    components: unknown[];
  };
  expect(sbom.bomFormat).toBe('CycloneDX');
  expect(sbom.specVersion).toMatch(/^1\.\d+$/);
  expect(Array.isArray(sbom.components)).toBe(true);

  // Un octet modifié dans l'archive est détecté.
  const archive = join(output, 'serpent-cosmique-1.0.0.zip');
  const bytes = readFileSync(archive);
  bytes[bytes.length >> 1] = (bytes[bytes.length >> 1] ?? 0) ^ 0xff;
  writeFileSync(archive, bytes);
  expect(() =>
    execFileSync('sha256sum', ['--check', 'SHA256SUMS'], { cwd: output, stdio: 'pipe' }),
  ).toThrow();
});

test('ct_77_artefacts_de_version : une version mal formée ou sans dossier de sortie est refusée', () => {
  for (const args of [['1.0.0;rm', 'x'], ['', 'x'], ['v1.0.0', 'x'], ['1.0.0']]) {
    expect(() =>
      execFileSync('sh', ['scripts/release-files.sh', ...args], { stdio: 'pipe' }),
    ).toThrow();
  }
});

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Fichiers suivis par git (chemins relatifs à la racine du projet). */
function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((name) => name !== '' && !name.endsWith('.png'));
}

const SECRET_PATTERNS: [string, RegExp][] = [
  ['clé privée', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY/],
  ['jeton GitHub', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ['jeton GitHub à granularité fine', /\bgithub_pat_[A-Za-z0-9_]{22,}\b/],
  ['clé AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['clé d’API Google', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['jeton Slack', /\bxox[baprs]-[0-9A-Za-z-]{10,}/],
  ['jeton npm', /\bnpm_[A-Za-z0-9]{36}\b/],
  [
    'chaîne de connexion avec mot de passe',
    /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\/[^\s:@/]+:[^\s@/]+@/,
  ],
  ['jeton JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  [
    'secret affecté en clair',
    /\b(?:api[_-]?key|secret|passw(?:or)?d|token)\b['"]?\s*[:=]\s*['"][A-Za-z0-9/+_=-]{20,}['"]/i,
  ],
];

function findSecrets(text: string): string[] {
  return SECRET_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
}

test('ct_74_aucun_secret : aucun motif de secret dans les fichiers ni dans tout l’historique, .gitignore et workflows conformes', () => {
  // Les motifs savent reconnaître un secret (contrôle des motifs eux-mêmes, avec des valeurs inventées).
  const invented = [
    `${'-'.repeat(5)}BEGIN PRIVATE KEY${'-'.repeat(5)}`,
    `gh${'p'}_${'a1B2'.repeat(9)}`,
    `AKIA${'ABCD1234'.repeat(2)}`,
    `${'postgres'}://admin:motdepasse@localhost/base`,
    `token = "${'x1Y2'.repeat(6)}"`,
  ];
  for (const sample of invented) expect(findSecrets(sample), sample).not.toEqual([]);

  const files = trackedFiles();
  expect(files.length).toBeGreaterThan(50);
  for (const file of files) expect(findSecrets(read(file)), file).toEqual([]);

  // Tout l'historique (toutes les branches, tous les changements de ce dossier), hors ce fichier de test,
  // dont les valeurs inventées servent à vérifier les motifs.
  const history = execFileSync(
    'git',
    ['log', '--all', '-p', '--no-color', '--', '.', ':(exclude)tests/acceptance/depot.spec.ts'],
    { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 },
  );
  expect(history.length).toBeGreaterThan(10_000);
  expect(findSecrets(history)).toEqual([]);

  // Aucun fichier d'environnement suivi (hors modèle), et .gitignore les exclut.
  expect(
    files.filter((name) => /(^|\/)\.env(\.|$)/.test(name) && !name.endsWith('.example')),
  ).toEqual([]);
  const ignore = read('.gitignore').split('\n');
  for (const entry of ['node_modules/', 'dist/', '.env', '.env.*']) expect(ignore).toContain(entry);

  // Workflows : aucun secret enregistré, aucun jeton écrit dans un journal.
  for (const name of readdirSync('.github/workflows')) {
    const workflow = read(`.github/workflows/${name}`);
    expect(workflow, name).not.toMatch(/\$\{\{\s*secrets\./);
    expect(workflow, name).not.toMatch(
      /echo[^\n]*(?:\$\{\{\s*github\.token|GH_TOKEN|GITHUB_TOKEN)/,
    );
  }
});

interface LockEntry {
  version?: string;
  resolved?: string;
  integrity?: string;
  hasInstallScript?: boolean;
}

test('ct_75_dependances : aucune dépendance à l’exécution, versions exactes, verrou avec empreintes, rien de tiers dans le site construit', () => {
  const pkg = JSON.parse(read('package.json')) as {
    dependencies?: unknown;
    devDependencies: Record<string, string>;
    overrides: Record<string, string>;
  };
  const lock = JSON.parse(read('package-lock.json')) as {
    lockfileVersion: number;
    packages: Record<string, LockEntry>;
  };
  expect(pkg.dependencies).toBeUndefined();
  expect(Object.keys(pkg.devDependencies).length).toBeGreaterThan(5);
  for (const [name, version] of Object.entries(pkg.devDependencies)) {
    expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
    expect(lock.packages[`node_modules/${name}`]?.version, `${name} dans le verrou`).toBe(version);
  }
  expect(lock.packages['node_modules/minimatch']?.version).toBe(pkg.overrides['minimatch']);

  const entries = Object.entries(lock.packages).filter(([path]) => path !== '');
  expect(entries.length).toBeGreaterThan(50);
  for (const [path, entry] of entries) {
    expect(entry.integrity, `${path} : empreinte`).toMatch(/^sha512-[A-Za-z0-9+/]+=*$/);
    expect(entry.resolved, `${path} : origine`).toMatch(/^https:\/\/registry\.npmjs\.org\//);
    expect(entry.hasInstallScript, `${path} : script d’installation`).toBeUndefined();
  }
  expect(read('.npmrc')).toMatch(/^ignore-scripts=true$/m);

  const dependabot = read('.github/dependabot.yml');
  expect(dependabot).toMatch(/package-ecosystem: npm/);
  expect(dependabot).toMatch(/package-ecosystem: github-actions/);

  // Site construit : aucune adresse absolue (hors l'espace de noms SVG), donc aucune origine tierce.
  const urls = new Set<string>();
  for (const name of listing('dist')) {
    if (!/\.(html|js|css|svg|webmanifest|txt)$/.test(name)) continue;
    for (const url of read(`dist/${name}`).match(/https?:\/\/[^\s"')<>]+/g) ?? []) urls.add(url);
  }
  expect([...urls]).toEqual(['http://www.w3.org/2000/svg']);

  // Licence du jeu et liste des ressources.
  expect(read('LICENSE')).toMatch(/MIT License/);
  expect(read('README.md')).toMatch(/Origine des ressources et licence/);
});

test('ct_78_documentation_securite : SECURITY.md, guide d’exploitation et guide de l’utilisateur contiennent les points exigés', () => {
  const text = `${read('SECURITY.md')}\n${read('docs/guide-exploitation.md')}`;
  const required: [string, RegExp][] = [
    ['données stockées et emplacement', /IndexedDB/],
    ['absence de communication du jeu', /n['’]émet aucune requête/],
    ['vérification de version par le navigateur', /vérification de (?:sa )?version/],
    ['effacement des données par plateforme', /Effacer les données du site|Paramètres des sites/],
    ['contenu lisible du fichier de sauvegarde', /n['’]est pas chiffré/],
    ['lien officiel unique', /seul lien/],
    [
      'ne pas restaurer un fichier d’origine inconnue',
      /Ne restaurez que des fichiers que vous avez créés/,
    ],
    [
      'ne jamais supprimer l’icône pour mettre à jour',
      /Ne supprimez pas l['’]icône|ne supprimez jamais l['’]icône/i,
    ],
    ['authentification à plusieurs facteurs', /plusieurs facteurs/],
    ['aucun autre site Pages sur le compte', /aucun autre site Pages|autre site Pages/],
  ];
  for (const [label, pattern] of required) expect(text, label).toMatch(pattern);

  const guide = read('docs/guide-utilisateur.md');
  for (let code = 1; code <= 8; code += 1) expect(guide, `E-0${code}`).toContain(`E-0${code}`);
  for (const file of ['SECURITY.md', 'docs/guide-exploitation.md', 'docs/guide-utilisateur.md']) {
    expect(read(file), file).toMatch(/\b(?:le|la|les|des|vous|votre)\b/);
  }
});

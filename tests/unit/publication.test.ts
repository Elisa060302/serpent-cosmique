import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { SW_MAX_BYTES, finalizeSite } from '../../scripts/site.mjs';
import { runBlocks } from '../support/workflows.ts';

const read = (path: string): string => readFileSync(path, 'utf8');
const release = read('.github/workflows/release.yml');
const temporary: string[] = [];

after(() => {
  for (const directory of temporary) rmSync(directory, { recursive: true, force: true });
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'serpent-test-'));
  temporary.push(directory);
  return directory;
}

/** Jobs d'un workflow : nom → texte du bloc (jusqu'au job suivant). */
function jobsOf(workflow: string): Record<string, string> {
  const start = workflow.indexOf('\njobs:\n');
  const parts = workflow.slice(start + 7).split(/\n(?= {2}[a-z-]+:\n)/);
  return Object.fromEntries(parts.map((part) => [/^\s*([a-z-]+):/.exec(part)?.[1] ?? '', part]));
}

describe('ct_76_workflows : release.yml, droits et déclencheurs (EXS-11, EXS-16)', () => {
  const jobs = jobsOf(release);

  it('déclenché par une étiquette vX.Y.Z seulement, jamais par pull_request_target', () => {
    assert.match(
      release,
      /^on:\n {2}push:\n {4}tags:\n {6}- 'v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+'\n/m,
    );
    assert.doesNotMatch(release, /pull_request|workflow_dispatch|branches:/);
  });

  it('droits par tâche : lecture partout, pages et jeton OIDC pour la publication, écriture pour la version', () => {
    assert.match(release, /^permissions:\n {2}contents: read$/m);
    assert.deepEqual(Object.keys(jobs), ['controle', 'construction', 'publication', 'version']);
    assert.match(jobs['controle'] ?? '', /permissions:\n {6}contents: read\n {6}actions: read/);
    assert.match(jobs['construction'] ?? '', /permissions:\n {6}contents: read\n/);
    assert.doesNotMatch(jobs['construction'] ?? '', /write/);
    assert.match(
      jobs['publication'] ?? '',
      /permissions:\n {6}pages: write\n {6}id-token: write\n/,
    );
    assert.match(jobs['version'] ?? '', /permissions:\n {6}contents: write\n/);
    assert.equal(release.match(/: write/g)?.length, 3, 'trois droits d’écriture, pas un de plus');
  });

  it('deux publications ne se chevauchent jamais et aucune n’en annule une autre (concurrence)', () => {
    assert.match(release, /^concurrency:\n {2}group: publication\n {2}cancel-in-progress: false$/m);
  });

  it('aucun secret enregistré : seuls le jeton éphémère du workflow et le jeton OIDC sont utilisés', () => {
    assert.doesNotMatch(release, /secrets\./);
    assert.match(release, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  });

  it('chaque action est épinglée par un SHA, checkout sans identifiants conservés, aucun cache', () => {
    const uses = [...release.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((m) => m[1] ?? '');
    assert.ok(uses.length >= 6);
    for (const reference of uses) assert.match(reference, /@[0-9a-f]{40}$/, reference);
    const checkouts = release.split(/uses: actions\/checkout@/).slice(1);
    assert.equal(checkouts.length, 2);
    for (const part of checkouts) {
      assert.match(part.split(/\n\s*- /)[0] ?? '', /persist-credentials: false/);
    }
    // `package-manager-cache: false` désactive le cache : c'est la seule mention admise.
    assert.doesNotMatch(
      release.replaceAll('package-manager-cache: false', ''),
      /actions\/cache|cache:|cache-dependency-path/,
    );
  });

  it('aucune expression de contexte GitHub dans un bloc run', () => {
    for (const block of runBlocks(release)) assert.doesNotMatch(block, /\$\{\{/, block);
  });

  it('la construction n’installe aucun navigateur et part d’un npm ci', () => {
    assert.doesNotMatch(release, /playwright install/);
    assert.match(jobs['construction'] ?? '', /run: npm ci\n/);
    assert.doesNotMatch(release, /npm install/);
  });

  it('l’étiquette doit être un ancêtre de origin/main, porter la version de package.json, et la CI doit être au vert sur le même commit', () => {
    const control = jobs['controle'] ?? '';
    assert.match(control, /git merge-base --is-ancestor "\$GITHUB_SHA" origin\/main/);
    assert.match(control, /fetch-depth: 0/);
    assert.match(control, /\[ "v\$version" = "\$TAG" \]/);
    assert.match(
      control,
      /gh run list --workflow ci\.yml --commit "\$GITHUB_SHA" --status success/,
    );
    for (const job of ['construction', 'publication', 'version']) {
      assert.match(jobs[job] ?? '', /needs: .*(controle|construction)/, `${job} n’attend pas`);
    }
  });

  it('la version est créée par gh release create, sans action tierce de publication', () => {
    assert.match(release, /gh release create "\$GITHUB_REF_NAME" release\/\* --verify-tag/);
    assert.doesNotMatch(release, /softprops|action-gh-release|create-release/);
  });

  it('seules les actions officielles de GitHub sont utilisées', () => {
    const uses = [...release.matchAll(/^\s*(?:- )?uses:\s*(\S+)@/gm)].map((m) => m[1] ?? '');
    for (const action of uses) assert.match(action, /^actions\//, action);
  });
});

describe('ct_124_durcissement_construction : étiquette posée hors de main (EXS-20)', () => {
  const command = /^\s*(git merge-base --is-ancestor "\$GITHUB_SHA" origin\/main)/m.exec(
    release,
  )?.[1];

  function git(directory: string, ...args: string[]): string {
    return execFileSync('git', ['-C', directory, ...args], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Essai',
        GIT_AUTHOR_EMAIL: 'essai@example.test',
        GIT_COMMITTER_NAME: 'Essai',
        GIT_COMMITTER_EMAIL: 'essai@example.test',
      },
    }).trim();
  }

  function isAccepted(directory: string, sha: string): boolean {
    try {
      execFileSync('sh', ['-c', command ?? 'false'], {
        cwd: directory,
        env: { ...process.env, GITHUB_SHA: sha },
        stdio: 'ignore',
      });
      return true;
    } catch {
      return false;
    }
  }

  it('le contrôle du workflow accepte un commit de main et refuse un commit d’une autre branche', () => {
    assert.ok(command, 'commande du workflow introuvable');
    const origin = temporaryDirectory();
    git(origin, 'init', '--quiet', '--initial-branch=main');
    writeFileSync(join(origin, 'a.txt'), 'a');
    git(origin, 'add', '.');
    git(origin, 'commit', '--quiet', '--message', 'sur main');
    const onMain = git(origin, 'rev-parse', 'HEAD');
    const clone = temporaryDirectory();
    git(clone, 'clone', '--quiet', origin, '.');
    git(clone, 'checkout', '--quiet', '-b', 'autre');
    writeFileSync(join(clone, 'b.txt'), 'b');
    git(clone, 'add', '.');
    git(clone, 'commit', '--quiet', '--message', 'hors main');
    const offMain = git(clone, 'rev-parse', 'HEAD');
    assert.equal(isAccepted(clone, onMain), true);
    assert.equal(isAccepted(clone, offMain), false);
  });
});

describe('ct_124_durcissement_construction : le site publié est exactement ce qui est pré-caché', () => {
  /** Dépôt et site minimaux : une source, un fichier public, et le site correspondant avec son sw.js. */
  function makeSite(): { root: string; dir: string } {
    const root = temporaryDirectory();
    mkdirSync(join(root, 'src/core'), { recursive: true });
    mkdirSync(join(root, 'src/sw'), { recursive: true });
    mkdirSync(join(root, 'public'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '2.3.4' }));
    writeFileSync(join(root, 'src/main.ts'), '');
    writeFileSync(join(root, 'src/core/version.ts'), '');
    writeFileSync(join(root, 'src/sw/sw.ts'), '');
    writeFileSync(join(root, 'public/index.html'), '<html></html>');
    const dir = join(root, 'dist');
    mkdirSync(join(dir, 'core'), { recursive: true });
    writeFileSync(join(dir, 'main.js'), 'export {};\n');
    writeFileSync(join(dir, 'core/version.js'), "export const VERSION = '0.0.0';\n");
    writeFileSync(join(dir, 'index.html'), '<html></html>');
    writeFileSync(
      join(dir, 'sw.js'),
      "const VERSION = '__VERSION__';\nconst FILES = '__FILES__';\n",
    );
    return { root, dir };
  }

  it('la construction injecte la version de package.json et une empreinte par fichier, de façon répétable', () => {
    const { root, dir } = makeSite();
    const result = finalizeSite({ root, dir });
    assert.deepEqual([result.version, result.files], ['2.3.4', 3]);
    const worker = read(join(dir, 'sw.js'));
    assert.match(worker, /^const VERSION = '2\.3\.4';$/m);
    assert.match(
      worker,
      /core\/version\.js [A-Za-z0-9+/]{43}\\nindex\.html [A-Za-z0-9+/]{43}\\nmain\.js [A-Za-z0-9+/]{43}"/,
    );
    assert.match(read(join(dir, 'core/version.js')), /VERSION = '2\.3\.4'/);
    finalizeSite({ root, dir, version: '2.4.0' });
    assert.match(read(join(dir, 'sw.js')), /^const VERSION = '2\.4\.0';$/m);
  });

  it('un fichier en trop dans dist/ fait échouer la construction ; une fois retiré, elle réussit', () => {
    const { root, dir } = makeSite();
    writeFileSync(join(dir, 'etranger.js'), 'x');
    assert.throws(() => finalizeSite({ root, dir }), /en trop \(etranger\.js\)/);
    rmSync(join(dir, 'etranger.js'));
    assert.doesNotThrow(() => finalizeSite({ root, dir }));
  });

  it('un fichier manquant, ou un sw.js absent, fait échouer la construction', () => {
    const { root, dir } = makeSite();
    rmSync(join(dir, 'index.html'));
    assert.throws(() => finalizeSite({ root, dir }), /manquants \(index\.html\)/);
    const other = makeSite();
    rmSync(join(other.dir, 'sw.js'));
    assert.throws(() => finalizeSite({ root: other.root, dir: other.dir }), /sw\.js absent/);
  });

  it('une version mal formée est refusée', () => {
    const { root, dir } = makeSite();
    for (const version of ['1.0', 'v1.0.0', '1.0.0-beta', '']) {
      assert.throws(
        () => finalizeSite({ root, dir, version }),
        /MAJEUR\.MINEUR\.CORRECTIF/,
        version,
      );
    }
  });

  it(`un sw.js de plus de ${SW_MAX_BYTES} octets fait échouer la construction (ENF-09)`, () => {
    const { root, dir } = makeSite();
    appendFileSync(join(dir, 'sw.js'), `// ${'x'.repeat(SW_MAX_BYTES)}\n`);
    assert.throws(() => finalizeSite({ root, dir }), /sw\.js fait \d+ octets/);
  });

  it('un sw.js sans emplacement pour la version ou la liste fait échouer la construction', () => {
    const { root, dir } = makeSite();
    writeFileSync(join(dir, 'sw.js'), "const FILES = '__FILES__';\n");
    assert.throws(() => finalizeSite({ root, dir }), /version de sw\.js introuvable/);
  });

  it('les sources portent les emplacements que la construction remplace', () => {
    assert.ok(read('src/sw/sw.ts').includes("const VERSION = '__VERSION__';"));
    assert.ok(read('src/sw/sw.ts').includes("const FILES = '__FILES__';"));
    assert.ok(read('src/core/version.ts').includes("export const VERSION = '0.0.0';"));
  });
});

describe('ct_71_analyse_statique : règles Semgrep locales et agent de service', () => {
  const rules = read('.semgrep.yml');

  it('fetch reste interdit partout sauf dans l’agent de service, qui garde les autres interdictions', () => {
    const blocks = rules.split(/\n {2}- id: /).slice(1);
    const byId = Object.fromEntries(blocks.map((block) => [block.split('\n')[0] ?? '', block]));
    assert.match(byId['no-network'] ?? '', /exclude:\n {8}- '\*\*\/sw\.ts'/);
    assert.match(byId['no-network'] ?? '', /pattern: fetch\(\.\.\.\)/);
    assert.match(byId['no-network-in-worker'] ?? '', /include:\n {8}- '\*\*\/sw\.ts'/);
    assert.doesNotMatch(byId['no-network-in-worker'] ?? '', /pattern: fetch\(\.\.\.\)/);
    assert.match(byId['no-network-in-worker'] ?? '', /new WebSocket/);
  });
});

describe('ct_122_depot_public : SECURITY.md et liste de contrôle d’exploitation (EXS-15, EXS-19)', () => {
  const security = read('SECURITY.md');
  const guide = read('docs/guide-exploitation.md');
  const checklist = guide.slice(
    guide.indexOf('## Avant la première publication'),
    guide.indexOf('## Publier une version'),
  );

  it('SECURITY.md : signalement privé sans adresse électronique, adresse IP reçue par GitHub, risque accepté', () => {
    assert.match(security, /signalement privé de GitHub/);
    assert.doesNotMatch(security, /[\w.+-]+@[\w-]+\.[\w.]+/, 'aucune adresse électronique');
    assert.match(
      security,
      /GitHub reçoit l'adresse IP du téléphone à l'installation, à chaque mise à jour installée et à chaque vérification de version/,
    );
    assert.match(security, /Un site ajouté plus tard sur le même compte/);
    assert.match(security, /## Risque accepté/);
  });

  it('SECURITY.md : le consentement n’est pas présenté comme une protection contre une publication piégée', () => {
    assert.match(
      security,
      /Ce consentement n'est pas une protection contre une publication piégée/,
    );
    assert.match(security, /authentification à plusieurs facteurs/);
  });

  it('SECURITY.md : lien officiel unique, jamais de commande téléchargée puis exécutée, ne pas supprimer l’icône sur iPhone', () => {
    assert.match(security, /un seul lien/);
    assert.doesNotMatch(security + guide, /(curl|wget)[^\n]*\|\s*(ba)?sh/);
    assert.match(security, /Ne supprimez pas l'icône/);
  });

  it('la liste commence par la vérification qu’aucun autre site Pages n’est publié, sinon organisation dédiée', () => {
    const first = /- \[ \] \*\*1\.(.*)/.exec(checklist)?.[1] ?? '';
    assert.match(first, /Aucun autre site GitHub Pages sur le compte \(obligatoire\)/);
    assert.match(checklist, /organisation gratuite dédiée/);
  });

  it('chaque réglage de la liste a sa commande gh api, sauf deux (interface du compte, valeur du workflow)', () => {
    const items = checklist.split(/\n(?=- \[ \] \*\*\d+\.)/).slice(1);
    assert.equal(items.length, 13);
    const withoutCommand = items.filter((item) => !/gh api/.test(item));
    assert.equal(withoutCommand.length, 3);
    for (const item of withoutCommand) assert.match(item, /interface|git log|Semgrep/);
    for (const topic of [
      /plusieurs facteurs/,
      /domaine personnalisé/,
      /`main` protégée/,
      /Étiquettes `v\*`/,
      /Environnement `github-pages`/,
      /Source de Pages/,
      /contributions externes/,
      /Dependabot/,
      /Signalement privé/,
      /`noreply`/,
      /donnée personnelle/,
    ]) {
      assert.match(checklist, topic);
    }
  });
});

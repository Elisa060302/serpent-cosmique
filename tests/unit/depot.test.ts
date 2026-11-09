import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { runBlocks } from '../support/workflows.ts';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

const WORKFLOWS = ['.github/workflows/ci.yml'];

describe('ct_124_durcissement_construction : règles du registre et traces de la CI', () => {
  const ci = read('.github/workflows/ci.yml');

  it('les règles du registre Semgrep sont récupérées à un commit figé (40 caractères)', () => {
    assert.match(ci, /repository: semgrep\/semgrep-rules\n\s+ref: [0-9a-f]{40}\n/);
  });

  it('la trace Playwright est conservée en cas d’échec et envoyée comme artefact par la CI', () => {
    assert.match(read('playwright.config.ts'), /trace: 'retain-on-failure'/);
    assert.match(ci, /if: failure\(\)\n\s+uses: actions\/upload-artifact@[0-9a-f]{40}/);
    assert.match(ci, /path: test-results\//);
  });
});

describe('ct_124_durcissement_construction : dépôt et CI', () => {
  it('.npmrc ignore les scripts d’installation', () => {
    assert.match(read('.npmrc'), /^ignore-scripts=true$/m);
  });

  it('package.json : versions exactes, aucun script pre ou post, scripts attendus', () => {
    const pkg = JSON.parse(read('package.json')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
      dependencies?: Record<string, string>;
      overrides: Record<string, string>;
    };
    assert.equal(pkg.dependencies, undefined, 'aucune dépendance à l’exécution');
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      assert.match(version, /^\d+\.\d+\.\d+$/, `${name} n’est pas épinglé : ${version}`);
    }
    assert.equal(pkg.devDependencies['@axe-core/playwright'], '4.14.0');
    assert.equal(pkg.devDependencies['@playwright/test'], '1.63.0');
    assert.equal(pkg.overrides['minimatch'], '11.0.3');
    assert.equal(pkg.overrides['playwright-core'], '1.63.0');
    for (const script of ['build', 'lint', 'typecheck', 'test', 'test:e2e', 'serve']) {
      assert.ok(pkg.scripts[script], `script ${script} absent`);
    }
    for (const name of Object.keys(pkg.scripts)) {
      assert.doesNotMatch(name, /^(pre|post)/, `script ${name} interdit`);
    }
  });

  it('Dependabot : npm et github-actions avec un délai de 7 jours', () => {
    const dependabot = read('.github/dependabot.yml');
    assert.match(dependabot, /package-ecosystem: npm/);
    assert.match(dependabot, /package-ecosystem: github-actions/);
    assert.equal(dependabot.match(/default-days: 7\b/g)?.length, 2);
  });

  for (const path of WORKFLOWS) {
    describe(path, () => {
      const workflow = read(path);

      it('permissions minimales : contents: read au niveau du workflow', () => {
        assert.match(workflow, /^permissions:\n {2}contents: read$/m);
      });

      it('chaque action est épinglée par un SHA de 40 caractères', () => {
        const uses = [...workflow.matchAll(/^\s*(?:- )?uses:\s*(\S+)/gm)].map((m) => m[1] ?? '');
        assert.ok(uses.length > 0);
        for (const reference of uses) {
          assert.match(reference, /@[0-9a-f]{40}$/, `non épinglée : ${reference}`);
        }
      });

      it('actions/checkout ne conserve pas les identifiants', () => {
        const parts = workflow.split(/uses: actions\/checkout@/).slice(1);
        assert.ok(parts.length > 0);
        for (const part of parts) {
          const step = part.split(/\n\s*- /)[0] ?? '';
          assert.match(step, /persist-credentials: false/);
        }
      });

      it('aucune expression de contexte GitHub dans un bloc run', () => {
        for (const block of runBlocks(workflow)) {
          assert.doesNotMatch(block, /\$\{\{/, `expression dans : ${block}`);
        }
      });

      it('npm ci partout, jamais npm install, pas de pull_request_target', () => {
        assert.match(workflow, /npm ci/);
        assert.doesNotMatch(workflow, /npm install/);
        assert.doesNotMatch(workflow, /pull_request_target/);
      });

      it('gitleaks par son binaire à somme vérifiée, jamais par gitleaks-action', () => {
        assert.doesNotMatch(workflow, /gitleaks-action/);
        assert.match(workflow, /sha256sum --check/);
        assert.match(workflow, /fetch-depth: 0/);
      });

      it('Semgrep à version fixe, osv-scanner par le workflow réutilisable épinglé', () => {
        assert.match(workflow, /semgrep==\d+\.\d+\.\d+/);
        assert.match(workflow, /--config \.semgrep\.yml/, 'règles locales absentes');
        assert.match(
          workflow,
          /--config \.semgrep-rules\/javascript/,
          'règles du registre absentes',
        );
        assert.match(
          workflow,
          /--config \.semgrep-rules\/typescript/,
          'règles du registre absentes',
        );
        assert.doesNotMatch(workflow, /--config p\//, 'règles du registre non figées');
        assert.match(
          workflow,
          /uses: google\/osv-scanner-action\/\.github\/workflows\/osv-scanner-reusable\.yml@[0-9a-f]{40}/,
        );
      });
    });
  }
});

describe('ct_124_exceptions_semgrep : chaque exception nomme sa règle et ne couvre qu’une ligne', () => {
  const sources = readdirSync('src', { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.ts'))
    .map((name) => ({ name, lines: read(`src/${name}`).split('\n') }));

  it('aucune exception sans identifiant de règle, et la ligne qui suit porte du code', () => {
    const found: string[] = [];
    for (const { name, lines } of sources) {
      lines.forEach((line, index) => {
        if (!line.includes('nosemgrep')) return;
        found.push(name);
        assert.match(line, /nosemgrep: semgrep-rules\.[a-z]+\.[\w.-]+\s*$/, `${name}:${index + 1}`);
        assert.doesNotMatch(lines[index + 1] ?? '', /^\s*(\/\/|$)/, `${name}:${index + 1}`);
      });
    }
    assert.deepEqual(found.sort(), ['platform/install.ts', 'ui/render/snake.ts']);
  });
});

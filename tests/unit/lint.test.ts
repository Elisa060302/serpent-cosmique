import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { ESLint } from 'eslint';

const FIXTURES = 'tests/fixtures/lint';

const EXPECTED: Record<string, string> = {
  'inner-html.ts': 'no-restricted-syntax',
  'outer-html.ts': 'no-restricted-syntax',
  'insert-adjacent-html.ts': 'no-restricted-syntax',
  'indexed-inner-html.ts': 'no-restricted-syntax',
  'document-write.ts': 'no-restricted-syntax',
  'eval.ts': 'no-eval',
  'new-function.ts': 'no-new-func',
  'implied-eval.ts': '@typescript-eslint/no-implied-eval',
  'fetch.ts': 'no-restricted-syntax',
  'window-fetch.ts': 'no-restricted-syntax',
  'xml-http-request.ts': 'no-restricted-syntax',
  'web-socket.ts': 'no-restricted-syntax',
  'event-source.ts': 'no-restricted-syntax',
  'send-beacon.ts': 'no-restricted-syntax',
  'permission-api.ts': 'no-restricted-syntax',
  'notification.ts': 'no-restricted-syntax',
  'geolocation.ts': 'no-restricted-syntax',
  'console.ts': 'no-console',
  'absolute-url.ts': 'no-restricted-syntax',
  'absolute-url-template.ts': 'no-restricted-syntax',
  'validation-object-assign.ts': 'no-restricted-syntax',
  'validation-spread.ts': 'no-restricted-syntax',
  'validation-destructuring.ts': 'no-restricted-syntax',
  'validation-computed-key.ts': 'no-restricted-syntax',
  'validation-computed-assignment.ts': 'no-restricted-syntax',
};

describe('ct_71_analyse_statique : fichiers d’essai signalés', () => {
  const eslint = new ESLint({ ignore: false });

  for (const [file, ruleId] of Object.entries(EXPECTED)) {
    it(`${file} est signalé par ${ruleId}`, async () => {
      const [result] = await eslint.lintFiles([`${FIXTURES}/${file}`]);
      assert.ok(result, 'aucun résultat');
      const errors = result.messages.filter((message) => message.severity === 2);
      assert.ok(
        errors.some((message) => message.ruleId === ruleId),
        `règle ${ruleId} absente : ${JSON.stringify(errors.map((m) => m.ruleId))}`,
      );
    });
  }

  it('la règle de construction d’objets neufs est active sur validation.ts et merge.ts, pas ailleurs', async () => {
    const restricted = async (file: string): Promise<string> => {
      const config = (await eslint.calculateConfigForFile(file)) as {
        rules: Record<string, unknown[]>;
      };
      return JSON.stringify(config.rules['no-restricted-syntax']);
    };
    for (const file of ['src/core/validation.ts', 'src/core/merge.ts']) {
      assert.match(await restricted(file), /Object\.assign interdit/, file);
    }
    assert.doesNotMatch(await restricted('src/core/progress.ts'), /Object\.assign interdit/);
  });

  it('les fichiers d’essai de validation sont signalés pour la bonne raison', async () => {
    const [result] = await eslint.lintFiles([`${FIXTURES}/validation-spread.ts`]);
    assert.match(result?.messages[0]?.message ?? '', /Décomposition d'objet interdite/);
  });

  it('toute règle de sécurité est active en erreur sur les fichiers de src', async () => {
    const config = (await eslint.calculateConfigForFile('src/ui/essai.ts')) as {
      rules: Record<string, unknown[]>;
    };
    for (const rule of [
      'no-eval',
      'no-new-func',
      '@typescript-eslint/no-implied-eval',
      'no-restricted-syntax',
      'no-console',
    ]) {
      assert.equal(config.rules[rule]?.[0], 2, `${rule} n'est pas en erreur`);
    }
  });
});

function sourcesOf(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourcesOf(path) : [path];
  });
}

describe('ct_73_permissions : inventaire statique des API du navigateur appelées par le code (EXS-03, EXS-17)', () => {
  const sources = sourcesOf('src').map((path) => ({ path, text: readFileSync(path, 'utf8') }));
  const outside = (allowed: string[], pattern: RegExp): string[] =>
    sources
      .filter(
        ({ path, text }) => !allowed.includes(path.replaceAll('\\', '/')) && pattern.test(text),
      )
      .map(({ path }) => path);

  it('le code ne lit sur `navigator` que la vibration, le verrou d’écran, le stockage, le partage de la sauvegarde, l’agent de service et ce qui sert à reconnaître le téléphone et le réseau', () => {
    const used = new Set<string>();
    for (const { text } of sources) {
      for (const match of text.matchAll(/\bnavigator\.(\w+)/g)) used.add(match[1] ?? '');
    }
    assert.deepEqual([...used].sort(), [
      'canShare',
      'onLine',
      'serviceWorker',
      'share',
      'standalone',
      'storage',
      'userAgent',
      'vibrate',
      'wakeLock',
    ]);
  });

  it('le sélecteur d’enregistrement, le partage et le téléchargement de la sauvegarde ne sont approchés que par `platform/save-io.ts`', () => {
    assert.deepEqual(
      outside(
        ['src/platform/save-io.ts'],
        /\b(showSaveFilePicker|createObjectURL|navigator\.share)\b/,
      ),
      [],
    );
  });

  it('l’agent de service n’est approché que par `platform/install.ts`, et le cache de l’origine que par lui et par `sw.ts`', () => {
    assert.deepEqual(outside(['src/platform/install.ts'], /\bserviceWorker\b/), []);
    assert.deepEqual(outside(['src/platform/install.ts', 'src/sw/sw.ts'], /\bcaches\b/), []);
  });

  it('aucun message n’est envoyé à l’agent de service, aucun service qui demande une permission n’est utilisé', () => {
    assert.deepEqual(outside([], /\b(postMessage|MessageChannel|BroadcastChannel)\b/), []);
    assert.deepEqual(
      outside(
        [],
        /\b(pushManager|PushManager|showNotification|periodicSync|backgroundFetch|unregister)\b/,
      ),
      [],
    );
  });

  it('aucune API à permission ou à invite n’apparaît dans le code', () => {
    const forbidden =
      /\b(Notification|geolocation|mediaDevices|getUserMedia|clipboard|contacts|bluetooth|usb|permissions|requestPermission|credentials)\b/;
    assert.deepEqual(outside([], forbidden), []);
  });

  it('le stockage persistant est demandé sans invite : seuls `persisted` et `persist` sont appelés', () => {
    const calls = new Set<string>();
    for (const { text } of sources) {
      for (const match of text.matchAll(/\bmanager\.(\w+)/g)) calls.add(match[1] ?? '');
    }
    assert.deepEqual([...calls].sort(), ['persist', 'persisted']);
  });

  it('seul le téléchargement de l’agent de service appelle `fetch`', () => {
    assert.deepEqual(outside(['src/sw/sw.ts'], /\bfetch\(/), []);
  });

  it('la règle ESLint du réseau laisse `fetch` à l’agent de service et à lui seul', async () => {
    const eslint = new ESLint({ ignore: false });
    const rules = async (file: string): Promise<string> => {
      const config = (await eslint.calculateConfigForFile(file)) as {
        rules: Record<string, unknown[]>;
      };
      return JSON.stringify(config.rules['no-restricted-syntax']);
    };
    assert.match(await rules('src/ui/essai.ts'), /\(fetch\|XMLHttpRequest/);
    const worker = await rules('src/sw/sw.ts');
    assert.doesNotMatch(worker, /\(fetch\|/);
    assert.match(worker, /\(XMLHttpRequest\|WebSocket\|EventSource\|sendBeacon\|Notification/);
    assert.match(worker, /Injection de HTML interdite/);
  });
});

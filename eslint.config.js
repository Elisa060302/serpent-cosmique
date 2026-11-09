import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const FORBIDDEN_HTML = '^(innerHTML|outerHTML|insertAdjacentHTML)$';
const FORBIDDEN_NETWORK =
  '^(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|Notification|geolocation|mediaDevices|clipboard|contacts|bluetooth|usb)$';
/** Seul l'agent de service télécharge (installation et mise à jour consentie) : `fetch` lui est permis. */
const FORBIDDEN_NETWORK_WORKER = FORBIDDEN_NETWORK.replace('fetch|', '');

/** Constructions interdites dans le code du jeu (injection de HTML, réseau, API à permission). */
const SECURITY_SYNTAX = [
  {
    selector: `MemberExpression[property.name=/${FORBIDDEN_HTML}/]`,
    message: 'Injection de HTML interdite : construire les éléments avec ui/dom.ts (textContent).',
  },
  {
    selector: `MemberExpression[computed=true][property.value=/${FORBIDDEN_HTML}/]`,
    message: 'Injection de HTML interdite : construire les éléments avec ui/dom.ts (textContent).',
  },
  {
    selector: 'MemberExpression[object.name="document"][property.name=/^write(ln)?$/]',
    message: 'document.write est interdit.',
  },
  {
    selector: 'Literal[value=/^https?:\\/\\//i]',
    message: 'URL absolue interdite : les chemins sont relatifs.',
  },
  {
    selector: 'TemplateElement[value.raw=/^https?:\\/\\//i]',
    message: 'URL absolue interdite : les chemins sont relatifs.',
  },
  {
    selector: `Identifier[name=/${FORBIDDEN_NETWORK}/]`,
    message: 'Réseau et API à permission interdits : le jeu ne communique avec aucun service.',
  },
];

/**
 * Le validateur et la fusion construisent des objets neufs, champ par champ, à partir des seules valeurs
 * validées (EXS-05) : ni Object.assign, ni décomposition d'objet, ni clé calculée (pollution de prototype).
 */
const CONSTRUCTION_SYNTAX = [
  {
    selector: 'CallExpression[callee.object.name="Object"][callee.property.name="assign"]',
    message: 'Object.assign interdit ici : construire un objet neuf, champ par champ.',
  },
  {
    selector: 'ObjectExpression > SpreadElement',
    message: "Décomposition d'objet interdite ici : construire un objet neuf, champ par champ.",
  },
  {
    selector: 'ObjectPattern',
    message: "Décomposition d'objet interdite ici : lire les champs un à un.",
  },
  {
    selector: 'ObjectExpression > Property[computed=true]',
    message: 'Clé calculée interdite ici : écrire les clés une à une.',
  },
  {
    selector: 'AssignmentExpression > MemberExpression.left[computed=true]',
    message: 'Écriture par clé calculée interdite ici : écrire les clés une à une.',
  },
];

export default tseslint.config(
  {
    // Les fichiers d'essai de tests/fixtures/lint contiennent exprès des constructions interdites.
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      'tests/fixtures/lint/',
      '.semgrep-rules/',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.test.json', './tsconfig.sw.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // `describe` et `it` de node:test renvoient une promesse que le lanceur de tests attend lui-même.
    files: ['tests/unit/**/*.ts'],
    rules: { '@typescript-eslint/no-floating-promises': 'off' },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { process: 'readonly', URL: 'readonly', Buffer: 'readonly' } },
    rules: { 'no-implied-eval': 'error' },
  },
  {
    files: ['src/**/*.ts', 'tests/fixtures/lint/**/*.ts'],
    rules: {
      'no-eval': 'error',
      'no-new-func': 'error',
      '@typescript-eslint/no-implied-eval': 'error',
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...SECURITY_SYNTAX],
    },
  },
  {
    files: ['src/sw/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...SECURITY_SYNTAX.map((rule) =>
          !rule.selector.startsWith('Identifier[name=')
            ? rule
            : { ...rule, selector: `Identifier[name=/${FORBIDDEN_NETWORK_WORKER}/]` },
        ),
      ],
    },
  },
  {
    files: ['src/core/validation.ts', 'src/core/merge.ts', 'tests/fixtures/lint/validation-*.ts'],
    rules: { 'no-restricted-syntax': ['error', ...SECURITY_SYNTAX, ...CONSTRUCTION_SYNTAX] },
  },
);

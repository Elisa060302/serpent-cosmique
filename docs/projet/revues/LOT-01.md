# Revue de code — LOT-01

## Itération 1 — 2026-11-02
- **Fichiers revus** : `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `tsconfig.json`, `tsconfig.test.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.semgrep.yml`, `.editorconfig`, `.gitignore`, `playwright.config.ts`, `LICENSE`, `README.md`, `scripts/build.mjs`, `scripts/serve.mjs`, `scripts/make-icons.mjs`, `public/index.html`, `public/styles.css`, `public/manifest.webmanifest`, `public/robots.txt`, `public/icons/*`, `src/main.ts`, `src/core/rules.ts`, `src/core/random.ts`, `src/ui/dom.ts`, `src/ui/texts.ts`, `src/ui/screens/menu.ts`, `tests/unit/{depot,lint,random,rules}.test.ts`, `tests/acceptance/{socle,serveur}.spec.ts`, `tests/fixtures/lint/*`, `.github/workflows/ci.yml`, `.github/dependabot.yml`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur (application et tests) ;
  - `npm test` → 76 réussis, 0 échoué ; couverture de lignes de `src/core` : 100 % (branches 92 %) ;
  - `npm run test:e2e` (Chromium révision 1243) → 30 réussis, 0 échoué (profils « Android paysage » et « iPhone SE paysage ») ;
  - copie propre du dépôt (sans `node_modules` ni `dist`) : `npm ci` puis `lint`, `typecheck`, `test`, `test:e2e` → tous réussis.
- **Analyse statique** :
  - `npm audit` → 0 vulnérabilité ;
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --error src` → 0 constat sur 6 fichiers ;
  - même configuration Semgrep sur une copie des fichiers d'essai de `tests/fixtures/lint` → 17 fichiers sur 18 signalés (voir constat 7) ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - SHA des actions comparés aux étiquettes publiées (`git ls-remote`) : `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0 et `google/osv-scanner-action` v2.7.0 conformes ; somme SHA-256 de l'archive gitleaks 8.30.1 identique au fichier de sommes publié.
  - Non exécuté ici : la CI GitHub, donc WebKit, gitleaks et osv-scanner.
- **Verdict** : APPROUVE

Écarts déclarés, jugés :
- Forçage `overrides` de `playwright-core` 1.63.0 : accepté. `@axe-core/playwright` déclare `playwright-core >= 1.0.0` en dépendance paire ; sans forçage, une seconde version, sans navigateurs disponibles, pourrait entrer. L'arbre reste dédupliqué (105 paquets dans le verrou, comme en 03 § 11). À consigner dans 03 (constat 10).
- `tsconfig.test.json` : accepté. Il sert à vérifier les types des tests et à l'analyse typée d'ESLint, sans rien changer à la construction.
- `LICENSE` (MIT, © CocoClaudo, titulaire désigné dans 01) et `README.md` court : acceptés. EXS-10 demande que le README indique l'origine et la licence des ressources, et les deux fichiers figurent dans la structure de 03 § 10.
- Semgrep limité aux règles locales en CI : accepté pour ce lot, car le critère de fin de 06 ne vise que les règles locales. Reste un écart avec 03 § 9 (constat 2).
- CT placés dans les fichiers de tests nommés par 06 plutôt que par 07 : accepté, 06 fait foi pour le périmètre du lot. Les identifiants de CT posent un autre problème (constat 1).
- Octet nul brut refusé en 400 : accepté. L'analyseur HTTP de Node rejette la ligne de requête avant le gestionnaire, et seul un réglage moins sûr permettrait de répondre 404. Le fichier n'est jamais servi, et `%00` donne bien 404 (testé).

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | `tests/acceptance/socle.spec.ts:151`, `:178`, `:224` ; `tests/acceptance/serveur.spec.ts:51` ; `tests/unit/depot.test.ts:31` | Les noms `ct_102_parametre_seed`, `ct_103_manifeste`, `ct_100_analyse_axe`, `ct_104_serveur_local` et `ct_106_durcissement_construction` ne portent pas l'identifiant du CT vérifié (CT-119, CT-120, CT-117, CT-121, CT-124). Ils désignent d'autres CT de 07 : CT-100 (prise en main par trois personnes), CT-102 (transfert entre téléphones), CT-103 et CT-104 (mise à jour), CT-106 (textes de référence). Ces noms sont repris de la colonne « Automatisé » de 07, elle-même incohérente. Effet : traçabilité exigence → test → résultat faussée, et `-g "ct_102_"` lance un autre test que CT-102. | Faire corriger la colonne « Automatisé » de 07, puis renommer les tests `ct_117_…`, `ct_119_…`, `ct_120_…`, `ct_121_…` et `ct_124_…`, avant le premier rapport de tests. |
| 2 | MINEUR | `.github/workflows/ci.yml:51-54` | 03 § 9 prévoit Semgrep avec les règles locales et celles du registre en CI. Seules les règles locales sont lancées. L'argument du registre injoignable vaut pour le poste de développement, pas pour la CI. | Ajouter en CI un pas Semgrep avec des règles du registre (par exemple `p/javascript` et `p/typescript`), ou consigner l'écart dans 03 § 9. |
| 3 | MINEUR | `eslint.config.js:4-26` | EXS-02 (03 § 6) prévoit des règles ESLint et Semgrep contre les URL absolues. Seul Semgrep, en CI, les détecte : `npm run lint` laisse passer `'https://…'` dans `src/`. | Ajouter des sélecteurs `Literal` et `TemplateElement` pour les valeurs commençant par `http://` ou `https://`, avec un fichier d'essai dans `tests/unit/lint.test.ts`. |
| 4 | MINEUR | `public/styles.css:37`, `:51` | `#app` a une hauteur minimale de `100dvh` et des marges égales aux zones sûres, et il contient `.menu`, qui a lui aussi `100dvh`. Sur un téléphone dont les zones sûres ne sont pas nulles (iPhone en paysage : barre d'accueil, encoche), le menu dépasse l'écran de la hauteur de ces marges et la page défile. Les profils Playwright n'ont pas de zones sûres et ne le voient pas. | Ne mettre la hauteur minimale qu'à un seul niveau (par exemple `.menu { min-height: 100%; }` dans un `#app` en `display: flex`, ou calcul qui retire les marges), puis vérifier en recette sur iPhone. |
| 5 | MINEUR | `public/styles.css:66` | `text-transform: uppercase` sur le titre contredit 05 § 7.2 (« pas de texte en majuscules continu »), alors que la maquette E1 écrit le titre en capitales : 05 est incohérent. | Retirer la transformation, ou faire trancher l'incohérence de 05. |
| 6 | SUGGESTION | `src/ui/screens/menu.ts:15-18` | La classe `button-secondary` n'a aucune règle dans `styles.css`. | La retirer, ou y porter le style des boutons secondaires. |
| 7 | SUGGESTION | `.semgrep.yml:14-24` | `no-dynamic-code` ne signale `setTimeout` qu'avec une chaîne littérale ou une concaténation. `setTimeout(code, 10)` (fichier d'essai `implied-eval.ts`) n'est donc pas signalé. ESLint le couvre, mais CT-71 lancera Semgrep sur les fichiers d'essai. | Ajouter un motif `setTimeout($X, ...)` filtré sur les arguments qui ne sont pas des fonctions, ou s'en remettre explicitement à ESLint dans CT-71. |
| 8 | SUGGESTION | `eslint.config.js:10-25` | Les sélecteurs ne couvrent ni l'accès calculé (`navigator['geolocation']`, `window['fetch']`) ni `window.document.write`. | Étendre les sélecteurs aux `MemberExpression[computed=true]` à valeur littérale et à `document.write` quel que soit l'objet. |
| 9 | SUGGESTION | `scripts/serve.mjs:96` | `stat(file)` n'est pas protégé : si le fichier disparaît entre `findFile` et `stat`, le rejet n'est pas capté dans le gestionnaire asynchrone et le serveur s'arrête. | Capter l'erreur et répondre 404. |
| 10 | SUGGESTION | `package.json:22` | Le forçage de `playwright-core` est justifié, mais 03 (§ 6 EXS-10 et § 11) ne mentionne que celui de `minimatch`. | Consigner ce forçage dans 03 § 11. |
| 11 | SUGGESTION | `src/core/random.ts:57` | `resolveSeed` n'est pas encore appelé par l'application : faute de partie dans ce lot, le critère « `?seed=42` rejoue la même partie » n'est couvert qu'au niveau unitaire. | Le brancher au lancement d'une partie en LOT-02, en lisant `location.search` une seule fois, et automatiser l'étape 1 de CT-119. |
| 12 | SUGGESTION | `.github/workflows/ci.yml:50` | Semgrep est installé à version fixe, comme le demande 06, mais ses dépendances indirectes ne sont pas figées. L'impact reste limité : tâche en lecture seule, sans identifiants conservés. | Figer les dépendances (fichier de contraintes avec `--require-hashes`, ou `uvx --exclude-newer`). |

Points positifs :
- Chaque critère de fin du lot a son test :
  - menu en paysage avec ses cinq entrées ;
  - politique CSP identique à 03 § 6, en premier élément de `<head>`, avec aucune violation, aucune requête vers une autre origine et aucune requête après le chargement ;
  - refus d'un cadre ;
  - analyse axe d'E1 ;
  - fichiers d'essai ESLint ;
  - graine reproductible et analyse stricte de `?seed=`, cas limites inclus (`%34%32`, `%00`, valeur en double, fragment) ;
  - manifeste sans point d'entrée ajouté ;
  - requêtes brutes contre `serve.mjs` : encodages, liens symboliques, `Host`, méthodes, écoute ;
  - durcissement du dépôt et de la CI vérifié par lecture des fichiers.
- `serve.mjs` est sobre et correct : décodage, refus de l'octet nul, confinement après `realpath`, aucune liste de répertoire, aucun en-tête ajouté.
- `dom.ts` n'admet que `textContent` et une liste fermée d'attributs, et aucune valeur de règle n'est dupliquée hors de `rules.ts`. La seule copie, la conversion en millimètres de la feuille de style, est contrôlée par un test.
- CI durcie : actions épinglées par SHA et vérifiées, `persist-credentials: false`, aucune expression de contexte dans un `run:`, somme de gitleaks vérifiée, Dependabot avec un délai de 7 jours.
- Aucune dépendance hors de 03 § 11, versions exactes, aucun script d'installation.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

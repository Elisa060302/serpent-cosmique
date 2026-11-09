# Revue de code — LOT-05

## Itération 1 — 2026-11-06
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-04 » :
  - agent de service et construction : `src/sw/sw.ts`, `tsconfig.sw.json`, `scripts/{build,site}.mjs`, `scripts/site.d.mts`, `scripts/release-files.sh` ;
  - jeu : `src/platform/install.ts`, `src/core/{version,rules}.ts`, `src/ui/screens/{about,install-help,menu,settings,game}.ts`, `src/ui/texts.ts`, `src/main.ts`, `public/styles.css` ;
  - dépôt et documentation : `.github/workflows/{release,ci}.yml`, `.semgrep.yml`, `eslint.config.js`, `playwright.config.ts`, `package.json`, `tsconfig*.json`, `.gitignore`, `.prettierignore`, `SECURITY.md`, `docs/guide-exploitation.md`, `README.md` ;
  - tests : `tests/acceptance/{installation,depot,reglages,classique,progression,socle}.spec.ts`, `tests/acceptance/support/{site,sauvegarde}.ts`, `tests/support/workflows.ts`, `tests/unit/{agent-de-service,publication,version,depot,lint}.test.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur (application, tests, agent de service) ;
  - `npm test` → 405 réussis, 0 échoué ; couverture de `src/core` : lignes 99,9 %, branches 96,0 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 298 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium) ;
  - rejeu à blanc de `release.yml` sur une copie propre du dépôt (fichiers suivis seulement) :
    - `npm ci`, `npm run build` → 54 fichiers, `sw.js` de 6 356 octets ;
    - `sh scripts/release-files.sh 1.0.0 release` → `serpent-cosmique-1.0.0.zip`, `serpent-cosmique-1.0.0.cdx.json` (CycloneDX 1.5) et `SHA256SUMS` ;
    - `sha256sum -c SHA256SUMS` → deux fichiers « OK ».
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat (7 règles, 46 fichiers) ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté : `release.yml` sur GitHub (jamais lancé), la CI GitHub (WebKit, gitleaks, osv-scanner, règles Semgrep du registre) et les commandes `gh api` du guide.
- **Verdict** : A_CORRIGER

Traitement de la revue de LOT-04 :
- Constat 1 (bruitage de fin à l'abandon) : traité, avec un test dans `ct_48` (bruitage joué, aucune vibration).
- Suggestion 2 (groupe radio) : traitée. Un seul arrêt de tabulation et les flèches du clavier passent d'un choix à l'autre, en boucle, comme le vérifie `ct_46`.
- Suggestion 3 (trace des échecs) : traitée. `trace: 'retain-on-failure'`, et la CI envoie `test-results/` comme artefact en cas d'échec.
- Suggestion 4 (règles Semgrep du registre) : traitée. `semgrep/semgrep-rules` est récupéré à un commit figé, et sa mise à jour figure dans le guide (case 13).

Arbitrages de l'équipe projet, pris en compte : le lien « Créer une sauvegarde » de E10 et la mention du fichier de sauvegarde dans `SECURITY.md` relèvent de LOT-06 ; ct_68 relève de la documentation.

Examen des points demandés :
- **Agent de service** :
  - consentement : sans consentement pour sa propre version, le nouvel agent refuse de s'installer, note la version proposée et ne télécharge rien. Avec le consentement, il télécharge tout sans le cache HTTP, vérifie chaque fichier (`ok`, `basic`, non redirigé, SHA-256 exact) avant toute écriture, remplit un cache neuf, puis l'activation supprime les anciens caches, consentement et proposition compris. Un échec laisse le cache de la version en place intact.
  - service : il ne répond qu'aux GET de son origine et de sa portée, depuis le cache seulement, et renvoie 404 pour le reste, jamais le réseau. Aucun gestionnaire de message, et `fetch` n'est appelé qu'au téléchargement.
  - taille : le plafond de 9 000 octets est imposé par `scripts/site.mjs` (6 356 octets aujourd'hui). La construction échoue aussi pour un fichier en trop ou manquant.
  - tests : unitaires sur l'agent isolé, puis Playwright avec deux constructions 1.0.0 et 1.1.0 servies l'une après l'autre (CA-1 à CA-4, ENF-09 version changée ou non, E-06 pour une empreinte fausse et pour une connexion coupée).
- **release.yml** :
  - la publication est déclenchée par une étiquette `vX.Y.Z` seulement ;
  - les droits sont donnés par tâche (`contents: read` partout, `pages: write` et `id-token: write` pour la publication, `contents: write` pour la version) ;
  - l'étiquette doit être un ancêtre de `origin/main` (`fetch-depth: 0`) et égale à la version de `package.json`, et une CI réussie est exigée sur le même commit (`gh run list`, `actions: read`) ;
  - aucun cache ni navigateur, `npm ci`, actions officielles épinglées par SHA, aucune expression de contexte dans un `run:` ;
  - la version est créée par `gh release create --verify-tag`.
  - Le rejeu local des étapes de construction et des artefacts réussit. Les contrôles propres à GitHub (`merge-base` sur `origin/main`, `gh run list`, déploiement Pages) ne sont vérifiés que par lecture et par le test `ct_124` sur un dépôt git local.
- **Liste de contrôle du guide** : elle commence par la vérification obligatoire qu'aucun autre site Pages n'est publié sur le compte (R-08), sinon une organisation dédiée. Chacun des 13 réglages a sa commande `gh api`, sauf deux justifiés (réglage d'adresse électronique du compte, valeur figée du workflow). Une case non cochée interdit la publication. `SECURITY.md` satisfait le critère de 06 : signalement privé sans adresse, adresse IP reçue par GitHub, risque accepté, consentement non présenté comme une protection.

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MAJEUR | `src/platform/install.ts:126-129`, `:156` | La version proposée reste dans Cache Storage (`serpent-cosmique-offer`) jusqu'à la mise à jour, et elle est relue à chaque ouverture, réseau ou non. Cas courant : le joueur ouvre le jeu connecté, voit la proposition sans toucher « Installer », puis le rouvre en mode avion. « À propos » affiche alors « Nouvelle version 1.1.0 disponible » et « Installer », et le repère « Mise à jour » apparaît au menu ; toucher « Installer » donne E-06. EF-29 CA-5 exige au contraire, en mode avion, « aucune proposition ni aucune erreur de mise à jour », et RG-89 réserve la proposition au jeu ouvert avec une connexion. Le test `ct_104` (mode avion) part d'un profil sans proposition et ne voit pas ce cas. Une proposition dont la version a été retirée du site resterait de même affichée indéfiniment. | Ne proposer que la version constatée par la vérification de la séance en cours, par exemple en effaçant l'entrée au démarrage puis en la relisant quand le nouvel agent s'arrête. Autre solution : ne l'afficher que si `navigator.onLine`, en suivant `online` et `offline`. Ajouter à `ct_104` le cas d'une proposition notée lors d'une ouverture connectée, puis d'une réouverture en mode avion : ni proposition, ni repère, ni erreur. |
| 2 | MINEUR | `src/ui/screens/about.ts:59-66`, `public/styles.css:794-796` | E-06 n'est distinguée que par la couleur et le texte, sans l'icône (« ⚠ » dans la maquette E10, « ! » dans 05 § 6 : « erreur : icône + texte + code »). LOT-03 a traité E-08 ainsi. | Ajouter l'icône, masquée aux lecteurs d'écran, comme pour le message passager d'erreur, et la vérifier dans `ct_67`. |
| 3 | SUGGESTION | `src/sw/sw.ts:59-62`, `src/platform/install.ts:192-206` | Si une version plus récente que la version proposée est publiée entre la proposition et le toucher de « Installer » (1.1.0 proposée, 1.2.0 servie), le consentement porte sur 1.1.0. L'agent 1.2.0 refuse donc de s'installer, et le joueur voit E-06 alors que rien n'a échoué. Le second essai réussit, puisque la proposition est passée à 1.2.0. | Une fois le constat 1 corrigé, relire la proposition après un refus, et la présenter de nouveau sans E-06 si elle a changé. |
| 4 | SUGGESTION | `docs/guide-exploitation.md` (cases 3 et 7) | Les commandes `gh api repos/<compte>/<dépôt>/pages` répondent 404 tant que GitHub Pages n'est pas activé. Le guide ne dit pas à quel moment l'activer (source « GitHub Actions ») dans la séquence d'avant la première étiquette. | Ajouter l'activation de Pages avec la source « GitHub Actions » avant la case 3, et préciser le résultat attendu avant cette activation. |

Points positifs :
- Conception de la mise à jour sobre et conforme à ADR-07 : aucun message entre la page et l'agent. Le consentement et la proposition sont deux entrées de Cache Storage, et le consentement est retiré après un échec, si bien qu'il ne vaut que pour une tentative.
- Ce qui est publié est exactement ce qui est pré-caché, vérifié à chaque construction : liste exacte des fichiers, version injectée dans le jeu et dans l'agent, empreintes, plafond de taille.
- Tests d'installation représentatifs :
  - publication sous un sous-dossier ;
  - redémarrage hors ligne avec 0 requête ;
  - deux versions servies l'une après l'autre ;
  - mesure des octets échangés ;
  - démarrage à froid sous 3 s ;
  - progression identique après la mise à jour ;
  - panneau d'installation propre à Android ou à iPhone ;
  - analyse axe sur E1, E10 et E14.
- `release.yml` couvert par des tests de lecture et par un rejeu des étapes de construction ; les suggestions de LOT-04 sont toutes traitées.

## Itération 2 — 2026-11-06
- **Fichiers revus** : changements depuis l'itération 1 :
  - code : `src/platform/install.ts`, `src/ui/screens/about.ts`, `public/styles.css` ;
  - documentation : `docs/guide-exploitation.md` ;
  - tests : `tests/acceptance/installation.spec.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 405 réussis, 0 échoué ; couverture de `src/core` : lignes 99,9 %, branches 96,0 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 303 réussis, **1 échoué** : `ct_67_mise_a_jour_echec : une version plus récente publiée après la proposition…` (iPhone SE paysage), sur l'attente du message de RG-90 ;
  - répétition ciblée `npx playwright test tests/acceptance/installation.spec.ts -g "version plus récente publiée|ct_66_mise_a_jour_consentie" --repeat-each=5` → 18 réussis, **2 échoués** :
    - le même test, cette fois sur Android paysage ;
    - `ct_66_mise_a_jour_consentie` (iPhone SE paysage), qui passait en itération 1.
  - Les trois échecs ont le même symptôme : après le rechargement qui suit la mise à jour, le menu s'affiche sans le message « Serpent Cosmique a été mis à jour en version X.Y.Z. Votre progression est conservée. », et la zone d'annonce contient en dernier « Prêt à jouer hors ligne ».
- **Analyse statique** : Semgrep, règles locales → 0 constat (7 règles, 46 fichiers) ; `npm audit` → 0 vulnérabilité ; autonomie du dépôt → aucun constat.
- **Verdict** : A_CORRIGER

Vérification des constats de l'itération 1 :

| # | Statut | Vérification |
|---|---|---|
| 1 (MAJEUR) | corrigé | `change()` ne présente la version proposée que si `navigator.onLine`, et suit `online` et `offline`. La proposition notée lors d'une ouverture connectée n'apparaît plus en mode avion, ni dans « À propos » ni au menu, et revient avec la connexion (nouveau test `ct_104`). Une version qui n'est plus publiée n'est plus proposée (nouveau test). |
| 2 (MINEUR) | corrigé | E-06 porte l'icône « ! », masquée aux lecteurs d'écran, le texte et le code restant dans la zone `alert` (testé dans `ct_67`). |
| 3 (SUGGESTION) | appliquée | Après un refus, la proposition est relue. Une version plus récente publiée entre-temps est proposée sans E-06, et son installation est testée. Ce test est toutefois instable (constat 5). |
| 4 (SUGGESTION) | appliquée | Le guide place l'activation de Pages (source « GitHub Actions », sans publication) après les cases 1 et 2, et signale le 404 attendu avant cette activation. |

Risque signalé, jugé (abandon de la proposition périmée si aucun nouvel agent n'est annoncé dans les 3 s qui suivent la vérification) : **acceptable**.
- Toute vérification qui trouve un `sw.js` différent de l'agent actif lance une installation, donc `updatefound`. Celui-ci est mis en file aussitôt après la résolution de `registration.update()`. Un délai de 3 s ne serait dépassé que si le fil principal restait bloqué plus de 3 s pendant le démarrage.
- L'erreur possible va dans le sens prudent : la proposition est masquée pour cette séance seulement, et l'entrée de Cache Storage, conservée, est relue et revérifiée à l'ouverture suivante. Rien ne s'installe ni ne se perd.
- Une vérification échouée (`checked` faux) ne fait rien abandonner. Défaut mineur : une proposition périmée reste notée, et elle peut apparaître brièvement (repère du menu) pendant ces 3 s à chaque ouverture connectée (constat 6).

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 5 | BLOQUANT | `src/main.ts:59-67`, `:279` ; `src/platform/install.ts:101-107`, `:121-128` | Test rouge et instable : `ct_67` (version plus récente) a échoué une fois sur la suite complète, puis 1 fois sur 5, et `ct_66` 1 fois sur 5. Cause probable dans le jeu, qu'on retrouve dans l'état final des trois échecs : l'état hors ligne part toujours de `preparing`, même quand un agent est déjà actif, et passe à `ready` quand `register()` répond. Si cela arrive après l'affichage du menu, `main.ts` affiche « Prêt à jouer hors ligne », et ce message passager remplace celui de RG-90 affiché juste avant (`showToast` ferme le message en cours). Deux défauts en résultent dans l'usage réel : le message de fin de mise à jour exigé par RG-90 et EF-29 CA-2 peut ne jamais être vu, et « Prêt à jouer hors ligne » peut s'afficher à des lancements ordinaires, alors que 05 § 5 ne le prévoit qu'au premier passage à l'état prêt. Le défaut est antérieur à cette itération. Il est relevé maintenant parce que la suite n'est plus fiablement verte. | Partir de `ready` quand la page est déjà contrôlée par un agent actif (`navigator.serviceWorker.controller`). N'afficher « Prêt à jouer hors ligne » qu'au premier passage réel à l'état prêt (aucun agent actif auparavant), et jamais par-dessus le message de RG-90. Puis répéter `ct_66`, `ct_67` et `ct_64` (`--repeat-each=10`, les deux profils) sans échec, et ajouter une vérification : à une ouverture ordinaire, aucun message « Prêt à jouer hors ligne ». |
| 6 | SUGGESTION | `src/platform/install.ts:164-177` | La proposition périmée n'est abandonnée qu'en mémoire : l'entrée `serpent-cosmique-offer` reste, et le repère « Mise à jour » peut apparaître pendant les 3 s de chaque ouverture connectée. | Supprimer aussi l'entrée de Cache Storage quand la vérification la contredit. |

## Itération 3 — 2026-11-07
- **Fichiers revus** : changements depuis l'itération 2 : `src/platform/install.ts`, `tests/acceptance/installation.spec.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 405 réussis, 0 échoué ; couverture de `src/core` : lignes 99,9 %, branches 96,0 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 306 réussis, 0 échoué ;
  - répétition rejouée par la revue : `npx playwright test tests/acceptance/installation.spec.ts -g "ct_64|ct_66|ct_67" --repeat-each=10` → 200 réussis sur 200, sur les deux profils.
- **Analyse statique** : Semgrep, règles locales → 0 constat (7 règles, 46 fichiers) ; `npm audit` → 0 vulnérabilité ; autonomie du dépôt → aucun constat.
- **Verdict** : APPROUVE

Vérification des constats de l'itération 2 :

| # | Statut | Vérification |
|---|---|---|
| 5 (BLOQUANT) | corrigé | `createInstaller()` part de `ready` quand la page est servie par un agent actif (`navigator.serviceWorker.controller` non nul). Il ne part de `preparing` qu'en l'absence de contrôleur, c'est-à-dire au premier lancement. « Prêt à jouer hors ligne » ne s'affiche donc plus aux ouvertures ordinaires, et ne recouvre plus le message de RG-90 au rechargement qui suit une mise à jour (la page est alors contrôlée par le nouvel agent). L'écoute de `controllerchange` est désormais branchée dès que les agents de service sont pris en charge, et plus seulement en préparation : elle reste active après une ouverture « prête ». Deux tests reproduisent le défaut d'origine (enregistrement de l'agent retardé jusqu'à l'affichage du menu, et relevé de tous les messages passagers) : aucun message à une ouverture ordinaire, et le seul message de RG-90 après une mise à jour. La répétition ci-dessus est entièrement verte. |
| 6 (SUGGESTION) | appliquée | La proposition contredite par la vérification est aussi supprimée de Cache Storage. Le test vérifie qu'il ne reste que le cache de la version en place. |

Cas non couvert signalé, jugé (rechargement forcé sur un poste de bureau, Maj + rechargement) : **acceptable, sans correction exigée**.
- Un rechargement forcé contourne l'agent de service : la page n'a pas de contrôleur, part de `preparing`, puis passe à `ready` quand `register()` répond. Elle peut alors afficher « Prêt à jouer hors ligne », message vrai et sans effet sur la progression.
- Ce geste n'existe pas dans l'application installée sur le téléphone, la cible du jeu (ENF-03), ni par le rechargement ordinaire d'un onglet.
- Le même contournement charge les fichiers depuis le réseau. Sur un poste de bureau, il peut donc exécuter une version publiée plus récente que celle de l'agent sans le consentement prévu par EF-29. C'est une limite du navigateur, pas du jeu, et elle ne touche que ce cas hors cible.
- À noter dans le guide d'exploitation, sans exigence pour ce lot : le consentement à la mise à jour vaut pour le jeu installé et pour un rechargement ordinaire, pas pour un rechargement forcé.

Aucun nouveau constat.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

# Revue de code — CORR-CI-01 (échecs WebKit et CI publiée)

## Itération 1 — 2026-11-10
- **Fichiers revus** : différence `b706893..8e05a12` sur le projet : `.github/workflows/ci.yml`, `CHANGELOG.md`, `public/styles.css`, `src/core/rules.ts`, `src/platform/install.ts`, `src/ui/dom.ts`, `src/ui/screens/end.ts`, `tests/acceptance/{accessibilite,classique,installation,interruptions,qualite,reglages}.spec.ts` ; relus avec 02 (EF-29, ENF-09), 03 (R-04), 04 (RSK-14), 05 § 7.2 et § 7.3, 07 (CT-65, CT-67, CT-69, CT-89, CT-104, CT-115), `playwright.config.ts` et `release.yml`.
- **Tests exécutés** : `npm test` → 567 réussis, 0 échoué (couverture des lignes de `src/core` : 99,64 %). Suite d'acceptation non relancée ici (exécution en cours de son côté par la recette interne) ; résultat annoncé : 1 094 réussis, 0 échec, 22 ignorés sur les 4 projets.
- **Analyse statique** : `npm run lint` → ESLint sans erreur, Prettier conforme ; `npm run typecheck` → les trois configurations sans erreur. `dist/sw.js` : 7 224 octets (plafond de 9 000).
- **Verdict** : APPROUVE

### Vérifications demandées

1. **Tests ignorés sous WebKit.**
   - ct_83 (ralentissement du processeur) et ct_68 (effacement des données du site) passent par le protocole de débogage de Chromium, que Playwright ne fournit pas pour WebKit. ct_89 était déjà limité à Chromium avant ce changement. Ces trois exclusions sont justifiées.
   - ct_84 est une mesure indicative de cadence d'images, sans valeur sous un WebKit sans affichage : exclusion justifiée.
   - ct_65 et les deux cas ct_104 en mode avion dépendent de `navigator.onLine` et des événements `online`/`offline`, que seul le hors-ligne simulé du navigateur fournit. Le contournement par le seul site coupé (`cutBrowserNetwork`) ne les reproduit pas : exclusion justifiée. Ces cas sont couverts sur téléphone (CT-65 côté téléphone, CT-115).
   - Les deux cas ct_67 « connexion coupée » sont exclus sur une justification non déterministe (« parfois »). Voir le constat 1.
   - Sous Chromium, `cutBrowserNetwork` appelle toujours `setOffline(true)` : ct_66, ct_67 et ENF-05 n'y changent pas.
   - Sous Chromium, aucun seuil n'est affaibli : 1,5 fois la mémoire de départ pour ct_89, 10 000 octets, 9 mm, 16 px, 3 mm et 4 mm. `phoneOf` ne fait que retrouver le profil.
   - ct_04 accepte désormais l'annonce « Prêt à jouer hors ligne » avant la partie. C'est une annonce légitime du menu (RG-64), et l'assertion principale (« 3 » annoncé) reste inchangée.
   - ct_89 prend sa mesure de départ après un premier passage par chaque chemin, et le seuil reste à 50 % (CT-89). La mesure porte ainsi sur la croissance due à la répétition, conformément au cahier.
   - ct_10 ajoute une attente qui renforce le test. ct_46 installe la sonde de vibration, ce qui ne change rien sous Chromium. ct_111 remplace la molette par un défilement scripté sous WebKit mobile, où Playwright refuse la molette.
2. **Conformité du code.**
   - Le consentement reste requis : `readRefusedOffer` ne fait que relire l'entrée de version proposée, et aucun chemin n'écrit le consentement hors de `update()`.
   - La CSP et `index.html` sont inchangés, `sw.js` aussi (7 224 octets).
   - `enterkeyhint` est ajouté à la liste fermée des attributs avec une valeur littérale, sans risque d'injection.
   - Les tailles du menu correspondent à 05 § 7.2 : 1,78 rem pour une racine de 18 px donne 32 px ; max(16 px, 0,89 rem) donne 16 px au moins. L'écart de 8 px figure dans l'échelle de 05 § 7.3.
   - Après « Installer », le rechargement attend l'état `activated`. Si l'activation échoue, `runUpdate` se résout à faux et E-06 s'affiche : le joueur n'est pas laissé sans réponse.
   - Le budget de 10 Ko est tenu dans les cas mesurés ; voir les constats 3 et 4 pour les cas limites.
3. **Neutralité et autonomie** : aucune mention interdite dans les lignes ajoutées. Le seul import nouveau (`../../src/core/rules.ts` dans un test) reste dans le projet.
4. **CI répartie.**
   - Les expressions `matrix.part` n'apparaissent que dans `name`, `env` et `with`, jamais dans un bloc `run` : `PART` passe par l'environnement.
   - Les permissions restent `contents: read` au niveau du workflow, sans élargissement par tâche.
   - `fail-fast: false` est posé, et les noms d'artefacts sont distincts par part.
   - Dans `release.yml`, `gh run list --workflow ci.yml --commit … --status success` porte sur le statut global de l'exécution, qui n'est un succès que si les trois parts réussissent. La condition reste valable.

### Constats

| # | Gravité (BLOQUANT, MAJEUR, MINEUR, SUGGESTION) | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | tests/acceptance/installation.spec.ts:63, :495, :514 | Les deux cas ct_67 « connexion coupée » sont ignorés sous WebKit. La justification (« le navigateur n'envoie **parfois** plus aucune requête ni ne charge la page depuis l'agent de service ») décrit un comportement intermittent, sans trace ni reproduction hors du jeu. Si ce comportement existait sur iPhone, il contredirait RG-91 (version en place utilisable, hors ligne comprise). Seule l'étape 3 de CT-115, jouée à la main, couvre maintenant EF-29 CA-3 sur iPhone. | Joindre au rapport de tests la preuve de la limite : trace CI, ou reproduction sur une page minimale avec agent de service sans le code du jeu. Indiquer dans CT-67 (07, champ « Automatisé ») « WebKit : non automatisé, couvert par CT-115 étape 3 ». |
| 2 | MINEUR | tests/acceptance/installation.spec.ts:105-116 | `installThenSeed` évite un rechargement pendant la toute première installation de l'agent de service, parce que WebKit la laisse alors en suspens jusqu'au redémarrage du navigateur. Ce comportement est de la même famille que l'activation en suspens corrigée dans le code (`src/platform/install.ts:100-113`), que l'équipe a traitée comme un défaut réel. Rien ne montre qu'il se limite au WebKit de Playwright : sur iPhone, un joueur qui recharge pendant « Préparation du mode hors ligne… » pourrait rester sans mode hors ligne jusqu'à la fermeture de Safari. La progression n'est pas en jeu. | Ajouter à la procédure iPhone (CT-115 étape 1 ou CT-93) un rechargement pendant la préparation du mode hors ligne, avec relevé de l'état « Prêt à jouer hors ligne ». Si le défaut est confirmé, le consigner comme limite connue (guide, RG-81 et HYP-31). |
| 3 | MINEUR | src/platform/install.ts:204-205 | L'attente fixe de 3 s (`UPDATE_EVENT_WAIT_MS`) avant la vérification de la page est une heuristique. Si la vérification du navigateur dure plus de 3 s, sur un réseau lent, la page lance la sienne pendant qu'elle est encore en cours. Sous WebKit, qui ne fusionne pas les deux, le nouveau `sw.js` serait alors téléchargé deux fois (environ 2 × 7,2 Ko), au-delà des 10 Ko d'ENF-09 quand la version a changé. | Pas de changement de code exigé. Consigner ce risque résiduel dans R-04 et le rapport de tests, et l'inclure dans le relevé d'ENF-09 sur iPhone (CT-95 et CT-104 sur l'adresse publiée, si possible sur réseau mobile lent). |
| 4 | MINEUR | tests/acceptance/installation.spec.ts:677-690 | ct_104 « sans nouvelle version, 10 Ko au plus » additionne les échanges dès que « Prêt à jouer hors ligne » est visible, ce qui est immédiat. La vérification propre de la page part désormais 3 s après l'ouverture : elle n'est plus comptée. Le risque réel est faible (réponses 304 d'environ 120 octets), mais le test ne mesure plus toute l'ouverture. | Avant de sommer, attendre la vérification de la page : par exemple, attendre `2 * UPDATE_EVENT_WAIT_MS`, ou attendre (`expect.poll`) une requête de `sw.js` supplémentaire après celle du navigateur. |
| 5 | MINEUR | docs/projet/07-cahier-de-recette.md:1014-1024 | Le résultat attendu de CT-69 est « Mêmes résultats sur Chromium et WebKit ». Son étape 2 ne prévoit que les tests ignorés pour absence d'API (vibrations, Wake Lock). Les 9 exclusions WebKit ajoutées ne figurent ni dans CT-69, ni dans le champ « Automatisé » des CT concernés, ni avec le CT téléphone qui les compense. | Compléter CT-69 avec la liste des exclusions WebKit, leur raison et leur compensation (CT-65 côté téléphone, CT-115, CT-93…). Mettre à jour les champs « Automatisé » de CT-65, CT-67, CT-68, CT-83, CT-84 et CT-104, puis le rapport de tests à sa prochaine édition. |
| 6 | MINEUR | public/styles.css:71 | La taille du titre est corrigée à 32 px (05 § 7.2), mais aucun test ne vérifie cette valeur. ct_88 ne contrôle qu'un minimum de 16 px, et l'ancien titre de 36 px était passé inaperçu. | Dans ct_01 ou ct_88, vérifier que le titre du menu mesure 32 px (à 0,5 px près) et que le texte du bandeau d'installation mesure 16 px au moins, à la taille de texte par défaut. |
| 7 | SUGGESTION | CHANGELOG.md:13 | « le menu tient dans l'écran en paysage quelle que soit la police du téléphone » promet plus que ce qui est vérifié (polices d'Ubuntu et de la CI, deux profils). | Écrire par exemple « le menu tient dans l'écran en paysage, y compris avec des polices plus larges ». |

Points positifs :
- Chaque défaut réel est corrigé à la source et avec peu de code : tailles de la charte, attribut `enterkeyhint`, rechargement après activation, relecture bornée de la version proposée, vérification de la page alignée sur celle du navigateur.
- Le consentement et la CSP ne sont pas touchés.
- Chaque exclusion WebKit porte sa raison dans le code.
- La matrice de CI est propre : variable passée par l'environnement, artefacts distincts, aucune permission ajoutée, condition de publication toujours valable.
- Sous Chromium, aucun seuil d'acceptation n'est assoupli.

## Correction ANO-04 — 2026-11-17
- **Fichiers revus** : différence `d26855d..27907bf` sur le projet : `src/platform/install.ts`, `src/sw/sw.ts`, `CHANGELOG.md`, `tests/acceptance/installation.spec.ts`, `tests/unit/agent-de-service.test.ts` ; relus avec 02 (RG-89, EF-29 CA-1 et CA-5, ENF-09), 03 (ADR-07, R-04), 05 (HYP-33).
- **Tests exécutés** : `npm test` → 568 réussis, 0 échoué. Suite d'acceptation non relancée ici ; résultat annoncé : `installation.spec.ts` trois fois de suite sur les 4 projets, 252 réussis sur 252 ; échanges d'une ouverture connectée mesurés à 9 520 octets sous WebKit et 609 octets sous Chromium.
- **Analyse statique** : `npm run lint` → ESLint sans erreur, Prettier conforme ; `npm run typecheck` → les trois configurations sans erreur. `dist/sw.js` (construit sur ce commit, il contient `X-Noted-At`) : 7 300 octets, sous le plafond de 9 000.
- **Verdict** : APPROUVE

### Vérifications
- **Consentement intact.** La page écrit toujours le consentement sans en-tête. L'agent ne s'installe que si le texte de cette entrée est égal à sa propre version (`sw.ts:61`), puis vérifie les empreintes. Seule l'entrée de la version proposée porte désormais l'heure d'écriture. Après « Installer », la vérification explicite (`runUpdate`) est inchangée.
- **Confiance accordée à `X-Noted-At`.**
  - Seul un script de la même origine (la page ou l'agent) peut écrire cet en-tête dans Cache Storage. Le réseau n'y a pas accès : la réponse est fabriquée par l'agent.
  - Sa valeur ne fait qu'une chose : empêcher que la page retire une proposition mémorisée. Elle ne déclenche ni téléchargement, ni installation, ni affichage d'une version qui ne serait pas déjà notée et validée par `isVersion` et `isNewerVersion`.
  - Une valeur absente, non numérique ou fausse vaut 0, ou au pire garde une proposition une ouverture de plus.
  - Il n'y a donc aucune régression de sécurité.
- **RG-89 et EF-29.**
  - Version nouvelle : elle est annoncée (`updatefound`), ou notée depuis l'ouverture quand l'annonce a précédé la page (`X-Noted-At` ≥ `performance.timeOrigin`). Elle reste proposée.
  - Version retirée : `sw.js` est identique, il n'y a ni annonce ni note, et la proposition est retirée. Ce cas est couvert par ct_104 « une version qui n'est plus publiée n'est plus proposée ».
  - Mode avion : `navigator.onLine` est faux, rien n'est retiré ni affiché (CA-5).
  - La page ne lance plus aucune vérification à l'ouverture. C'est conforme à ADR-07, à R-04 (« le jeu n'émet rien ») et à HYP-33.
- **CSP et budget.** `index.html` et la politique ne changent pas, et l'en-tête ne crée aucun échange réseau. Le test d'ENF-09 n'attend plus d'échec sous WebKit, et sa mesure couvre l'attente de `UPDATE_EVENT_WAIT_MS` plus 2 s.
- **Neutralité** : aucune mention interdite dans les lignes ajoutées.
- **Constats de l'itération 1** :
  - n° 3 (double téléchargement possible sur réseau lent) : levé, la page ne vérifie plus la version à l'ouverture.
  - n° 4 (mesure d'ENF-09 prise trop tôt) : levé, la mesure attend `UPDATE_EVENT_WAIT_MS` plus 2 s.
  - n° 7 (CHANGELOG) : levé.
  - n° 1, 2, 5 et 6 : hors du champ de ce commit, ils restent ouverts.

### Constats

| # | Gravité (BLOQUANT, MAJEUR, MINEUR, SUGGESTION) | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | src/platform/install.ts:212-219 | L'ancien code ne retirait la proposition que si la vérification avait abouti (`checked`). Le nouveau la retire dès qu'il n'y a ni annonce ni note après 3 s. Téléphone « connecté » mais site injoignable (portail captif, réseau saturé, panne de l'hébergement), ou vérification du navigateur plus longue que 3 s : une version toujours publiée disparaît alors d'« À propos » pour la séance et son entrée est effacée. Elle revient à l'ouverture suivante qui aboutit, puisque l'agent la note de nouveau. Aucune perte de données ni installation : c'est une dégradation passagère de RG-89. Depuis la page, sans requête, on ne peut pas distinguer ce cas d'une version retirée. | Pas de changement de code exigé. Mentionner ce cas limite au guide (« si la proposition disparaît, rouvrez le jeu avec une bonne connexion ») ou dans R-04, et le relever lors de CT-115 sur téléphone. |
| 2 | SUGGESTION | src/platform/install.ts:214 | La comparaison rapproche l'horloge de l'agent (`Date.now()`) de celle de la page (`performance.timeOrigin`). Si l'heure du téléphone est reculée entre deux ouvertures, une note ancienne peut passer pour récente : la proposition est alors gardée une ouverture de trop. L'effet est sans conséquence. | Aucune, sauf à documenter l'hypothèse d'une horloge monotone dans le commentaire. |

Points positifs :
- La correction retire du code au lieu d'en ajouter : la page ne fait plus aucune requête à l'ouverture, conformément à l'architecture.
- Le nouvel en-tête est vérifié par un test unitaire.
- Le test d'ENF-09 redevient une exigence stricte sous WebKit.

## Correction ANO-10 — 2026-11-17
- **Fichiers revus** : différence `c1a4329..1a5c7be` sur le projet : seul `tests/acceptance/installation.spec.ts` change (`reopenForMeasure`, mesure de ct_66 et de ct_104). Le code du jeu (`src/`, `public/`) est inchangé.
- **Tests exécutés** : `npm test` → 568 réussis, 0 échoué. Suite d'acceptation non relancée ici.
- **Analyse statique** :
  - `npm run typecheck` → sans erreur.
  - `npm run lint` → ESLint sans erreur. Prettier est en échec, mais sur un seul fichier non suivi et hors du commit, `tests/acceptance/zz-sonde6.spec.ts` (constat 2). Les fichiers du commit sont conformes.
- **Verdict** : APPROUVE

### Vérifications
- **La mesure ne devient pas plus permissive.**
  - Le plafond reste à 10 000 octets par ouverture.
  - Chaque ouverture mesurée (deux dans ct_66 et deux dans ct_104) l'est désormais sur au moins `UPDATE_EVENT_WAIT_MS` plus 2 s, et doit contenir au moins une requête de `/sw.js`. La mesure ne peut donc plus réussir en passant à côté de la vérification de version.
  - Tout ce qui est échangé pendant cette fenêtre est compté, y compris une éventuelle seconde vérification de la même ouverture.
  - Ne sont plus comptées que les requêtes qui partent pendant la fermeture du navigateur précédent. Elles appartiennent à l'ouverture précédente : celle de préparation pour la première mesure, et pour la seconde une ouverture mesurée dont la vérification a déjà été exigée dans sa propre fenêtre.
  - Réserve : une requête tardive d'une ouverture mesurée, partie après sa fenêtre de 5 s et avant la fermeture, ne serait comptée nulle part (constat 3).
- **Plausibilité de l'explication.**
  - L'ancien repère était pris avant la fermeture. La vérification que le navigateur programme environ une seconde après une navigation pouvait donc partir à la fermeture de l'ouverture précédente et tomber dans la fenêtre mesurée.
  - Dans ct_66, la version 1.1.0 est servie juste avant la fermeture : cette requête télécharge alors un `sw.js` complet. On obtient bien 2 × 7 968 = 15 936 octets, l'écart observé.
  - L'absence de requête de `register()` est conforme à la spécification des agents de service : un enregistrement existant avec la même adresse de script et le même mode `updateViaCache` se termine sans vérification.
  - Le caractère intermittent (1 ouverture sur 72) s'accorde avec une course entre la fermeture et ce délai d'environ une seconde.
  - L'explication est plausible. Sa preuve (reproduction à volonté en fermant 850 ms après une navigation) n'est cependant pas consignée dans le projet : le rapport de tests attribue encore ANO-10 à `register()` (constat 1).
- **Neutralité** : aucune mention interdite dans les lignes ajoutées.
- **Délai** : le passage à 60 s pour ct_66 est cohérent avec deux fenêtres de plus de 5 s, plus les étapes du test.

### Constats

| # | Gravité (BLOQUANT, MAJEUR, MINEUR, SUGGESTION) | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | docs/projet/08-rapport-de-tests.md:180 | La fiche d'ANO-10 donne encore pour cause probable l'appel de `register()` à chaque chargement, et propose une piste de correction dans le code. La cause retenue, la vérification partie à la fermeture et comptée dans la fenêtre suivante, n'y figure pas. La reproduction (fermeture 850 ms après une navigation) et la preuve que `register()` n'émet rien n'y figurent pas non plus. | À la vérification d'ANO-10, mettre la fiche à jour : cause établie, reproduction, preuve sur `register()`, nature de la correction (test seul, jeu inchangé), puis relevés par ouverture après correction. Garder la mesure sur iPhone réel (CT-115 étape 5). |
| 2 | MINEUR | tests/acceptance/zz-sonde6.spec.ts | Ce fichier de sonde d'ANO-10 n'est pas suivi par git ni compris dans le commit. Il est pourtant présent dans le dossier du projet : `npm run lint` y échoue (Prettier), et il serait exécuté par `npm run test:e2e` et par la CI s'il était commité. | Le supprimer, ou le déplacer hors du dossier du projet, avant le prochain commit et l'export. |
| 3 | SUGGESTION | tests/acceptance/installation.spec.ts:80-93, :402-426, :710-727 | Les échanges qui suivent la fenêtre d'une ouverture mesurée, jusqu'à la fermeture, ne sont attribués à aucune ouverture. | Pour un décompte complet, compter chaque ouverture de son repère jusqu'au repère suivant pris après la fermeture : `reopenForMeasure` renverrait aussi le nombre d'échanges avant la fermeture, ajouté à la mesure de l'ouverture qui se termine. |

Points positifs :
- Le diagnostic évite de modifier le jeu pour une cause qui vient du test.
- Le plafond reste inchangé.
- Exiger au moins une requête de `sw.js` dans la fenêtre rend la mesure plus probante qu'avant.
- ct_66 et ct_104 mesurent désormais de la même façon.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

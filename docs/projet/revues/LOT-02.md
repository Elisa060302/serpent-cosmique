# Revue de code — LOT-02

## Itération 1 — 2026-11-02
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-01 » :
  - moteur : `src/core/{types,board,commands,engine,scheduler,color,rules}.ts`, `src/core/modes/classic.ts` ;
  - plateforme : `src/platform/lifecycle.ts` ;
  - interface : `src/ui/{input,layout,router,announcer,dom,settings-state,texts}.ts`, `src/ui/render/{board,decor,snake,candies,hud}.ts`, `src/ui/screens/{menu,modes,game,pause,end,rotate}.ts`, `src/main.ts`, `public/styles.css` ;
  - tests : `tests/unit/{moteur,commandes,ordonnanceur,couleurs,contrastes,disposition,glissement,textes,depot,lint,random}.test.ts`, `tests/acceptance/{classique,socle,serveur}.spec.ts`, `tests/acceptance/support/jeu.ts`, `tests/support/{pilote,contraste}.ts`, `tests/fixtures/lint/absolute-url*.ts` ;
  - dépôt et documentation : `eslint.config.js`, `.github/workflows/ci.yml`, `README.md`, `docs/projet/07-cahier-de-recette.md` (noms de tests).
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur (application et tests) ;
  - `npm test` → 158 réussis, 0 échoué ; couverture de `src/core` : lignes 100 %, branches 93,6 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → construction puis 100 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium).
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat sur 29 fichiers ;
  - règles du registre (`p/javascript`, `p/typescript`) : registre injoignable depuis le poste de revue, donc non exécutées ici ; elles le seront en CI ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - `dist/` ne contient que le code de `src/` compilé et les fichiers de `public/`, sans aucun code de test.
  - Non exécuté ici : la CI GitHub, donc WebKit, gitleaks, osv-scanner et les règles Semgrep du registre.
- **Verdict** : APPROUVE

Traitement des constats de la revue de LOT-01 :
- Constat 1 (noms des tests) : traité. Les tests portent désormais `ct_117_…`, `ct_119_…`, `ct_120_…`, `ct_121_…` et `ct_124_…`, et la colonne « Automatisé » de 07 a été corrigée.
- Constat 2 (Semgrep du registre en CI) : traité. Le pas `p/javascript` et `p/typescript` est ajouté dans `ci.yml:55-56`, et sa présence est vérifiée par `depot.test.ts`. Reste une suggestion (constat 12 ci-dessous).
- Constat 3 (URL absolues dans ESLint) : traité. Sélecteurs `Literal` et `TemplateElement` ajoutés, avec deux fichiers d'essai vérifiés par `lint.test.ts`.
- Constat 4 (hauteur `100dvh`) : traité. Seul `#app` porte la hauteur minimale, `.menu` le remplit en `flex`, et un test simule des zones sûres non nulles sans défilement. Reste à vérifier en recette sur iPhone.
- Constat 5 (titre en capitales) : traité. La transformation est retirée et le test vérifie `text-transform: none`.
- Constat 11 (`?seed=` branché) : traité. La graine est lue à chaque lancement de partie, et le test d'acceptation `ct_119_parametre_seed` compare les bonbons affichés à ceux du moteur avec la graine 42.
- Suggestions 6, 7, 8, 9, 10 et 12 : non traitées, elles restent ouvertes. Par exemple, `.button-secondary` n'a toujours aucune règle CSS, et 03 § 11 ne mentionne toujours pas le forçage de `playwright-core`.

Écarts déclarés, jugés :
- **Bandeau en DOM** au lieu du canevas (05 § 7.3) : accepté. Le texte passe par `textContent`, le bouton pause est un bouton natif, et l'analyse axe porte sur le bandeau. À consigner dans 05 (constat 8).
- **Bouton pause « II » + « Pause »** : accepté. Le nom visible est le nom accessible (WCAG 2.5.3), et la cible fait 90 × 60 px, au-dessus des 9 mm. À consigner dans 05 § 4.3 (constat 8).
- **Pas d'interpolation entre deux pas** : accepté pour ce lot. Les critères mesurables d'ENF-06 (régularité des pas, aucun intervalle au-delà du double, images par seconde) n'en dépendent pas, et l'ordonnanceur les tient à 60 Hz et 120 Hz. En revanche, 03 § 3 (« fournit la fraction de pas ») et § 3.1 (« le dessin interpole ») décrivent autre chose : à consigner (constat 8). La fluidité perçue sera jugée en recette sur le S22 (CT-98).
- **Gestes pris à `pointerdown`** : conforme à RG-23 pour les flèches. Pour le bouton pause, l'écart est accepté : un toucher qui suit de près un glissement ne produit pas toujours de `click`. Le glissement exclut le bouton pause (RG-21), et le clavier reste couvert par `click` avec `detail === 0`.
- **Réglage de commande en mémoire seulement** : accepté. L'écran des réglages arrive avec EF-21 (LOT-04). Dans l'incrément livré, le joueur ne peut donc pas encore choisir « Flèches », même si EF-07 est implémentée et testée. Les tests d'acceptation basculent le réglage en important le module construit, sans aucun code réservé à la recette dans le jeu.
- **Tests du moteur dans `tests/unit/`** : accepté, car 06 ne fixe pas cet emplacement. Les fichiers cités par 07 (`moteur/*.test.ts`, `partie.spec.ts`, `commandes.spec.ts`…) n'existent pas, mais la traçabilité par numéro de CT est juste (constat 11).

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | `public/styles.css:177-183`, `:192-209`, `:235` | Aucune marge à droite du bandeau : le bouton pause touche le bord haut droit de la zone sûre, et les flèches sont à 2 px des bords. Sur Android, les zones sûres sont nulles hors encoche, donc le bouton pause se trouve dans le coin arrondi du S22. ENF-04 interdit qu'un bouton soit caché par les coins arrondis, et 05 § 7.3 demande une marge de 8 px en plus des zones sûres. Les profils Playwright n'ont pas de coins arrondis et ne le voient pas. | Appliquer la marge de 8 px au bandeau (haut et droite) et aux colonnes de flèches, en gardant le calcul de `computeLayout` cohérent et sans passer sous les tailles minimales. Mesurer en recette (CT-97). |
| 2 | MINEUR | `src/platform/lifecycle.ts:14-21` | L'entrée d'historique ajoutée au début de la partie n'est jamais retirée. Après « Menu », sur l'écran de fin ou sur le menu, le premier appui sur le bouton retour ne fait rien de visible et le second ferme le jeu. Sur l'écran « Choisissez un mode » avant toute partie, au contraire, le premier appui ferme le jeu. Le comportement change donc selon que l'on a joué ou non. | Retirer l'entrée en quittant la partie vers le menu, sans course avec « Rejouer » (`history.back()` est asynchrone), ou traiter le bouton retour sur tous les écrans comme « ‹ Retour ». Tester : « Rejouer » puis retour donne la pause ; « Menu » puis retour donne le comportement retenu. |
| 3 | MINEUR | `src/core/rules.ts:56`, `:85-92` ; `public/styles.css:244` | ENF-19 : `SIZES_MM.arrow` (12 mm) et `SIZES_MM.pauseButton` (9 mm) ne sont utilisés nulle part dans `src/`. Les tailles réelles viennent de `.arrow { min-height: calc(12 * var(--mm)) }`, de `LAYOUT.arrowColumnPx: 80` (largeur utile de 76 px pour un minimum de 75,6 px) et de `LAYOUT.hudHeightPx: 60`. Modifier la règle dans `rules.ts` resterait sans effet. Les tests d'acceptation protègent les minimums, pas l'unicité de la valeur. | Dériver ces tailles des constantes de `rules.ts`, par exemple `--arrow-min` posé par le code comme `--arrow-max`, `arrowColumnPx` calculé à partir de `SIZES_MM.arrow`, et une vérification que `hudHeightPx` est au moins égal à `SIZES_MM.pauseButton`. Sinon, retirer les constantes mortes. |
| 4 | MINEUR | `src/ui/screens/pause.ts:9`, `:105` ; `src/ui/dom.ts:37-40` | Code mort, interdit par 06 § 1 : `PauseDialogs.isOpen` n'est jamais appelé, et le paramètre `accessibleName` de `createButton` n'est jamais fourni. | Les retirer. |
| 5 | MINEUR | `src/ui/announcer.ts:7-15` | La zone vivante est créée au premier message et reçoit ce message dans la même tâche. Les lecteurs d'écran n'annoncent en général pas le contenu initial d'une zone qui vient d'apparaître : le « 3 » du premier compte à rebours sera probablement perdu, alors que 05 § 4.4 et § 6 demandent l'annonce de chaque seconde. | Créer la zone au démarrage (`main.ts`), avant tout message. |
| 6 | MINEUR | `src/ui/screens/game.ts:146-152`, `src/ui/screens/pause.ts:100-104` | À la reprise, la boîte de pause est retirée avec le bouton qui avait le focus : le focus retombe sur `body`. 05 § 6 demande qu'il revienne au bouton qui a ouvert le sous-écran. | Rendre le focus au bouton pause à la fermeture de la boîte, et le vérifier dans `ct_108`. |
| 7 | MINEUR | `tests/acceptance/classique.spec.ts:467-485` | EF-16 CA-2 part d'une partie terminée avec un serpent violet. `ct_35` abandonne juste après le départ, quand le serpent est encore rose : le test ne détecterait pas une couleur reportée d'une partie à l'autre. | Avant la fin, manger un bonbon d'une autre couleur que le rose (graine choisie), vérifier cette couleur, puis « Rejouer » et vérifier le serpent rose de 4 cases et le score de 0. |
| 8 | MINEUR | `docs/projet/03-dossier-architecture.md` § 3 et § 3.1 ; `docs/projet/05-conception-ux.md` § 4.3 et § 7.3 | Les écarts acceptés ci-dessus (absence d'interpolation, bandeau en DOM, libellé visible « Pause ») contredisent 03 et 05. Les lots suivants et la recette s'appuieraient sur une description fausse. | Faire consigner ces écarts dans 03 et 05 par leurs responsables. |
| 9 | SUGGESTION | `src/ui/screens/game.ts:176`, `src/ui/render/hud.ts:37-39` | Le score est réécrit à chaque image (`textContent`), même quand il ne change pas : une mutation du DOM et un recalcul de style par image, jusqu'à 120 fois par seconde. | Ne mettre à jour le score que lorsqu'il change. |
| 10 | SUGGESTION | `tests/acceptance/classique.spec.ts:189-190`, `:197` | `FRAME` est utilisé plus haut dans le fichier que sa déclaration. Cela fonctionne à l'exécution, mais se lit mal. | Déclarer la constante en tête de fichier, avec `STEP_MS`. |
| 11 | SUGGESTION | `tests/acceptance/classique.spec.ts:522`, `:552`, `:600` ; `tests/unit/ordonnanceur.test.ts:19` | Les numéros de CT sont justes, mais les suffixes et les fichiers diffèrent de 07 : `ct_82_grille_entiere_et_cases` / `ct_82_dispositions_ecrans`, `ct_83_temps_de_navigation` / `ct_83_performance_indicative`, `ct_84_regularite_des_pas` / `ct_84_fluidite`, `ct_108_focus_dialogues_echap` / `ct_108_focus_et_dialogues`. Les fichiers cités par 07 (`partie.spec.ts`, `commandes.spec.ts`, `moteur/*.test.ts`…) n'existent pas. | Aligner les noms, ou faire mettre à jour 07, avant le rapport de tests. |
| 12 | SUGGESTION | `.github/workflows/ci.yml:55-56` | Les paquets de règles du registre ne sont pas figés : le résultat de la CI peut changer sans aucun commit. | Accepter cette variabilité en connaissance de cause (et la noter dans 03 § 9), ou figer une copie des règles dans le dépôt. |
| 13 | SUGGESTION | `src/ui/screens/pause.ts:59`, `:107` | Après une pause automatique (orientation verticale), « Non » ou Échap dans la confirmation rouvre la pause sans la mention « Partie mise en pause ». | Conserver l'indicateur `automatic` lors du retour à la pause. |

Points positifs :
- Moteur pur, court et lisible :
  - la case de la queue est libérée sauf croissance (RG-08) ;
  - la victoire est détectée au placement impossible (RG-09) ;
  - la file de 2 commandes avec demi-tour et répétition ignorés suit exactement RG-25 et RG-26 ;
  - la file est vidée à la pause (RG-27) ;
  - toutes les valeurs de règle de jeu sont dans `rules.ts`.
- Ordonnanceur testé à 60 Hz et 120 Hz pour chaque vitesse de 6 à 12 c/s : aucun pas rattrapé après une reprise, retard abandonné au-delà de 2 pas par image, aucune dérive sur une minute.
- Arc-en-ciel sans scintillement : chaque case du serpent garde sa teinte toute sa vie, ce qui est vérifié par un test.
- Tests d'acceptation solides :
  - le moteur sert d'oracle, et chaque pas affiché est comparé à celui du moteur par lecture des pixels du canevas ;
  - les gestes tactiles sont réels (protocole de débogage) ;
  - l'horloge est simulée ;
  - le délai de 1 s ± 0,2 s avant l'écran de fin est mesuré ;
  - aucune requête réseau, aucune erreur et aucune violation CSP pendant une partie complète.
- Chaque CA du lot a son test (EF-02, EF-03, EF-04, EF-05, EF-06, EF-07, EF-08, EF-09, EF-16, EF-25, EF-28), sauf ceux explicitement reportés (RG-10, Zen, skins, Contre la montre). La règle de 06 est respectée : moteur avec graine pour 400 bonbons, 100 apparitions avec un serpent de 200 cases et une victoire à 288 cases ; Playwright pour les gestes.
- Analyse axe sans violation sérieuse ni critique sur E2, E3 (glissement et flèches), E4, E5 (pause et confirmation), E6 et E12, sur les deux profils.
- Sécurité : DOM construit uniquement par `textContent` et une liste fermée d'attributs, aucune API réseau ni API à permission, `?seed=` passé par l'analyse stricte de LOT-01, aucun code réservé à la recette dans le jeu.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

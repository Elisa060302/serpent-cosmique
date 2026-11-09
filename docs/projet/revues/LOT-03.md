# Revue de code — LOT-03

## Itération 1 — 2026-11-02
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-02 » :
  - moteur : `src/core/{validation,savefile,records,progress,skins,format,types,rules}.ts` ;
  - plateforme : `src/platform/{storage,lifecycle}.ts` ;
  - interface : `src/main.ts`, `src/ui/screens/{end,records,notice,menu,modes,game,pause}.ts`, `src/ui/{toast,announcer,dom,layout,texts}.ts`, `src/ui/render/hud.ts`, `public/styles.css` ;
  - dépôt : `eslint.config.js`, `README.md` ;
  - tests : `tests/unit/{validation,enveloppe,progression,records,skins,format,textes,lint,disposition}.test.ts`, `tests/acceptance/{progression,classique}.spec.ts`, `tests/acceptance/support/{jeu,sauvegarde}.ts`, `tests/fixtures/lint/validation-*.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 320 réussis, 0 échoué ; couverture de `src/core` : lignes 99,9 %, branches 96,5 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 184 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium).
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat sur 39 fichiers ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté ici : la CI GitHub (WebKit, gitleaks, osv-scanner, règles Semgrep du registre).
- **Verdict** : A_CORRIGER

Traitement des constats de la revue de LOT-02 :
- Constat 1 (marges) : traité. Le bandeau a une marge de 8 px en haut et à droite, les colonnes de flèches ont leur propre marge, et `ct_82` mesure les écarts aux bords.
- Constat 2 (bouton retour) : traité selon RG-95 et HYP-45. `createBackButton` tient un seul niveau d'historique hors du menu. « ‹ Retour », « Menu » et Échap passent par `history.back()`. « Rejouer » garde le niveau de la partie. Quatre tests `ct_60` couvrent ces cas, avec la sortie du jeu depuis le menu.
- Constat 3 (ENF-19) : traité. `LAYOUT.arrowPx` est calculé à partir de `SIZES_MM.arrow`, et la feuille de style reçoit `--arrow-min`, `--pause-button` et `--margin` du code. Un test vérifie que `pauseButtonPx` est au moins égal à `SIZES_MM.pauseButton`.
- Constat 4 (code mort) : traité.
- Constat 5 (zone vivante) : traité. `installAnnouncer()` est appelé au démarrage, et un test vérifie l'annonce de « 3 ».
- Constat 6 (focus après la pause) : traité, avec un test.
- Constat 7 (EF-16 CA-2) : traité. La graine est choisie pour un premier bonbon d'une autre couleur que le rose, la couleur est vérifiée, puis « Rejouer » est contrôlé.
- Constat 8 (écarts consignés) : traité dans 03 § 12.5 et dans 05 § 4.3 et § 7.3.
- Suggestion 11 (noms des tests) : traitée par 07 v1.2.
- Suggestions 9, 12 et 13 : non traitées, elles restent ouvertes.

Décisions de l'équipe projet, vérifiées dans le code :
- HYP-46 et HYP-47 : record créé au nom prérempli, « Joueur » au tout premier record, nom finalement enregistré proposé ensuite. Le comportement est conforme, mais la ligne d'aide et deux CA ne le sont pas (constats 1 et 2).
- HYP-48 / RG-93 (E-08) : écran de fin conservé, progression gardée en mémoire et réécrite à l'enregistrement suivant. Conforme, à la durée d'affichage près (constat 4) ; voir aussi le constat 3.
- HYP-49 / RG-94 : `allowFuture` est utilisé pour la progression locale et la partie en cours ; le contrôle reste strict par défaut (fichier importé). Couvert par CT-125, en unitaire et en acceptation.

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MAJEUR | `src/ui/texts.ts:83`, `src/ui/screens/end.ts:143-146` | La ligne d'aide du champ du nom reprend l'ancien texte : « Enregistré sous ce nom. Touchez le champ pour le changer. ». 05 § 4.6 et § 5 demandent « Nom enregistré : <nom>. Touchez le champ pour en saisir un autre. », et le rappel « Touchez « Valider » pour enregistrer ce nom. » dès que le texte du champ diffère du nom enregistré. Le texte actuel est trompeur. Après avoir tapé « Léa », l'écran affiche « Enregistré sous ce nom » à côté de « Léa », alors que le record reste au nom de « Coco » (RG-53, HYP-46). Le joueur qui touche ensuite « Rejouer », « Menu » ou le bouton retour perd son nom sans en être averti. Au tout premier record, la même phrase s'affiche à côté d'un champ vide, alors que le record s'appelle « Joueur ». | Mettre les deux textes de 05 dans `texts.ts`, afficher le nom réellement enregistré et ajouter le rappel quand le champ diffère de ce nom (le retirer s'il redevient identique). Tester les deux états dans `ct_39`, y compris au premier record (« Nom enregistré : Joueur. … »). |
| 2 | MAJEUR | `tests/acceptance/progression.spec.ts:417-500` | Critères d'acceptation sans test : EF-18 CA-5 (taper « Léa », bouton retour du téléphone sans « Valider » : record au nom de « Coco », puis « Coco » proposé au record suivant) et la seconde moitié d'EF-18 CA-6 (valider le champ vide au premier record, puis « Joueur » proposé au record suivant). La sortie par « Rejouer » prévue par CT-39 (étape 6) n'est pas testée non plus. Seule la sortie par « Menu » l'est. | Ajouter ces cas à `ct_39_saisie_du_nom` : sortie par le bouton retour (`page.goBack()`), par « Rejouer » et par « Menu », chaque fois avec un texte tapé, puis contrôle du nom enregistré et du nom proposé à la partie suivante ; premier record validé vide, puis « Joueur » proposé. |
| 3 | MAJEUR | `src/platform/storage.ts:72-88`, `:166-176` | La connexion IndexedDB est ouverte une seule fois au démarrage et n'est jamais rouverte. Si le navigateur la ferme en cours de session (événement `close` de `IDBDatabase`, défaut connu de WebKit sur iPhone après un passage en arrière-plan, effacement des données du site), chaque `database.transaction()` lève `InvalidStateError`. Toutes les écritures échouent jusqu'au redémarrage du jeu. E-08 conseille alors de libérer de l'espace, ce qui ne change rien. La progression gardée en mémoire est perdue à la fermeture : records et compteurs des parties jouées depuis la perte de connexion. RG-93 promet au contraire une nouvelle tentative effective, et RG-83 aucune perte. | Écouter `close` et, sur `InvalidStateError` ou `close`, rouvrir la base une fois puis réessayer l'écriture dans la même file. Tester avec une sonde qui ferme la connexion (ou fait échouer `IDBDatabase.prototype.transaction` une fois) : la fin de partie suivante est enregistrée, sans E-08. |
| 4 | MINEUR | `src/core/rules.ts:124`, `src/ui/toast.ts:13-22`, `public/styles.css:524-538` | E-08 reste affiché 6 s, au lieu de 8 s (05 § 4.6 et § 5), sans l'icône « ! » demandée par 05 § 4.6 et § 6 (« erreur : icône « ! » + texte + code »). Le message passager est placé à 8 px du bas de la fenêtre, sans tenir compte de `env(safe-area-inset-bottom)` : sur iPhone, il passe sous la barre d'accueil (ENF-04). | Durée propre aux erreurs passagères (8 s) dans `rules.ts`, icône « ! » non porteuse seule de l'information, marge basse ajoutée à la zone sûre. Tester la durée et l'icône dans `ct_79`. |
| 5 | MINEUR | `public/styles.css:251` | Texte des flèches à `0.89rem` (14,2 px), sous le minimum de 16 px de 05 § 6. Sur le S22, 14,2 px × 0,18 mm × 0,7 = 1,79 mm, sous les 1,8 mm de hauteur de majuscules d'ENF-12. | Revenir à 16 px au moins, par exemple en réduisant le pictogramme ou l'interlignage, ou en élargissant la colonne dans les limites de `computeLayout`. Ajouter une mesure de la taille de police à `ct_13` ou `ct_88`. |
| 6 | MINEUR | `tests/acceptance/progression.spec.ts:735-773` | EF-16 CA-4 n'est vérifié qu'en partie. Le test ne contrôle pas qu'aucun message n'apparaît quand l'enregistrement réussit à nouveau, et il lit IndexedDB au lieu de fermer puis de rouvrir le jeu, comme le demande le CA. | Contrôler l'absence de `.toast` après la seconde partie, puis recharger la page et vérifier les compteurs des deux parties dans le jeu. |
| 7 | MINEUR | `tests/acceptance/classique.spec.ts` (`ct_60_bouton_retour`) | EF-01 CA-4 porte sur l'écran « Records » : Records, retour, menu, retour, le jeu se ferme. Le test passe par l'écran des modes. Le mécanisme est le même, mais le CA n'est pas exercé tel qu'il est écrit, et la sortie de « Records » par le bouton retour n'est testée nulle part. | Ajouter ce parcours avec « Records », et vérifier le focus rendu au bouton « Records ». |
| 8 | SUGGESTION | `src/core/validation.ts:34-41` | `isValidName` accepte un nom fait d'espaces ou entouré d'espaces. Le jeu n'en produit jamais (`cleanName`), mais un fichier importé (LOT-06) pourrait en contenir, alors que RG-51 les exclut. | Refuser un nom dont `trim()` diffère du nom ou est vide, avec un test sur le corpus. |
| 9 | SUGGESTION | `src/platform/storage.ts:91-98` | Une erreur de lecture passagère au démarrage est traitée comme une progression illisible (E-05, valeurs par défaut). La première écriture remplace alors `progress`, qui était peut-être intacte. Seule `progressPrevious` en garde une version plus ancienne. | Distinguer l'échec de lecture de l'échec de validation, par exemple en réessayant la lecture une fois avant E-05. |
| 10 | SUGGESTION | suggestions 9, 12 et 13 de LOT-02 | Toujours ouvertes : score réécrit à chaque image ; règles Semgrep du registre non figées ; indicateur « Partie mise en pause » perdu après « Non ». | Les traiter quand ces fichiers seront modifiés. |

Points positifs :
- Validateur conforme à EXS-04 et EXS-17 :
  - liste blanche par `Object.keys` exacts, objets simples distingués des tableaux, bornes du dictionnaire ;
  - structure neuve construite champ par champ ;
  - prédicat de caractères unique, partagé avec la saisie du nom ;
  - `JSON.parse` capté (100 000 crochets imbriqués refusés sans exception) ;
  - somme SHA-256 recalculée à partir des seules valeurs validées.
- Règle ESLint de construction d'objets neufs active sur `validation.ts` et `merge.ts`, vérifiée par cinq fichiers d'essai et par la configuration calculée.
- Écritures en une seule transaction `strict`, sérialisées dans une file. L'écran de fin attend la fin de l'écriture. `progressPrevious` reprend la dernière version réellement lisible, testée pour quatre corruptions, sans pollution de `Object.prototype`.
- Tests solides :
  - 20 fermetures forcées réelles du navigateur sans perte ;
  - partie interrompue comptée une seule fois après deux réouvertures ;
  - jeu de données maximal affiché sans débordement ;
  - injection `<img src=x onerror=alert(1)>` affichée littéralement ;
  - 300 mutations aléatoires de l'enveloppe ;
  - analyse axe sur E6, E7 et E13.
- Les huit constats mineurs de LOT-02 sont traités et testés.

## Itération 2 — 2026-11-02
- **Fichiers revus** : changements depuis l'itération 1 :
  - code : `src/platform/storage.ts`, `src/ui/screens/end.ts`, `src/ui/texts.ts`, `src/ui/toast.ts`, `src/core/rules.ts`, `src/core/validation.ts`, `src/main.ts`, `public/styles.css` ;
  - tests : `tests/acceptance/{progression,classique}.spec.ts`, `tests/unit/{rules,textes,validation}.test.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 326 réussis, 0 échoué ; couverture de `src/core` : lignes 99,9 %, branches 96,5 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 196 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium).
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat sur 39 fichiers ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté ici : la CI GitHub (WebKit, gitleaks, osv-scanner, règles Semgrep du registre).
- **Verdict** : APPROUVE

Vérification des constats de l'itération 1 :

| # | Statut | Vérification |
|---|---|---|
| 1 (MAJEUR) | corrigé | `nameHintMessage` affiche le nom réellement enregistré (`savedName`, « Joueur » au premier record). Le rappel « Touchez « Valider » pour enregistrer ce nom. » apparaît dès que `cleanName(champ)` diffère de ce nom, et disparaît s'il redevient identique. Il est relié au champ par `aria-describedby`. Les textes sont dans `texts.ts` et conformes à 05 § 5. Les tests `ct_39` couvrent l'aide avec « Coco », le rappel qui apparaît puis disparaît, et le premier record. |
| 2 (MAJEUR) | corrigé | EF-18 CA-5 est testé pour les trois sorties sans « Valider » (« Menu », « Rejouer », bouton retour) : record au nom de « Coco », `lastName` à « Coco », puis « Coco » proposé au record suivant. EF-18 CA-6 : premier record validé vide, « Joueur » enregistré puis proposé. |
| 3 (MAJEUR) | corrigé | `storage.ts` suit l'événement `close` de la connexion et, sur `InvalidStateError`, rouvre la base et réessaie une fois. La lecture et l'écriture passent toutes deux par `withDatabase`. Un test avec une sonde qui simule une connexion fermée vérifie que la fin de partie est enregistrée (2 parties) sans E-08. |
| 4 (MINEUR) | corrigé | Les erreurs passagères durent 8 s (`ERROR_TOAST_MS`, mesuré à 7,9 s puis 8,1 s dans `ct_79`) et portent l'icône « ! » (masquée aux lecteurs d'écran, le texte et le code restant lus). Le message passager tient compte des zones sûres du bas et des côtés. |
| 5 (MINEUR) | corrigé | Le texte des flèches est à `max(16px, 0.89rem)`, mesuré à 16 px au moins sur chaque libellé dans `ct_13`. |
| 6 (MINEUR) | corrigé | Le test vérifie l'absence de message après la seconde partie réussie, puis le rechargement du jeu sans E-05 avec les deux parties comptées. |
| 7 (MINEUR) | corrigé | Le parcours « Records », retour, menu (focus sur « Records »), retour, sortie du jeu est testé, ainsi que le même chemin par « ‹ Retour ». |
| 8 (SUGGESTION) | appliquée | `isValidName` refuse un nom avec une espace de début ou de fin, ou fait d'espaces. Trois cas sont ajoutés au corpus. `cleanName` produisant toujours un nom sans espace de bord, aucun nom enregistré par le jeu n'est refusé au lancement suivant. |
| 9 (SUGGESTION) | appliquée | Une erreur de lecture au démarrage est réessayée une fois avant de conclure à une progression illisible (E-05). |
| 10 (SUGGESTION) | ouverte | Inchangée : score réécrit à chaque image, règles Semgrep du registre non figées, indicateur « Partie mise en pause » perdu après « Non ». |

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 11 | SUGGESTION | `src/platform/storage.ts:85-94` | Seule `InvalidStateError` déclenche la réouverture. Une transaction annulée parce que la connexion se ferme pendant l'écriture donne E-08 une fois ; l'écriture suivante rouvre bien la base, grâce à l'événement `close`. Comportement acceptable au regard de RG-93. | Aucune correction exigée ; à observer en recette sur iPhone (CT-96, CT-101). |

Points positifs : les corrections sont ciblées, chaque constat a son test, et les nouveaux tests reproduisent les situations décrites par les CA et par 05 (sorties sans validation, connexion fermée, durée du message mesurée à l'horloge simulée).

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

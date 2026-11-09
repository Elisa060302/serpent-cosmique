# Revue de code — LOT-07

## Itération 1 — 2026-11-07
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-06 » :
  - moteur : `src/core/engine.ts`, `src/core/board.ts`, `src/core/modes/{time-attack,asteroids,black-hole,bonus-traps,zen,constellation}.ts`, `src/core/{rules,types,progress}.ts` ;
  - interface : `src/ui/render/{obstacles,candies,hud,board}.ts`, `src/ui/screens/{game,modes,end,notice,save}.ts`, `src/ui/{dom,texts}.ts`, `src/main.ts`, `public/styles.css` ;
  - plateforme : `src/platform/save-io.ts` (commentaire) ;
  - documentation : `SECURITY.md`, `README.md`, 01 (HYP-51), 02 v1.4 et v1.5 ;
  - tests : `tests/unit/{contre-la-montre,asteroides,trou-noir,bonus,zen,constellation,endurance-modes,construction-dom,contrastes,progression,textes,validation,rules}.test.ts`, `tests/acceptance/{modes,progression,sauvegarde,securite}.spec.ts`, `tests/acceptance/support/{jeu,fichiers}.ts`, `tests/support/{modes,pilote}.ts`.
- **Tests exécutés**, sur une machine sans autre charge (aucune analyse lancée en parallèle) :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 507 réussis, 0 échoué ; couverture de `src/core` : lignes 99,8 %, branches 95,9 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 406 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium).
  - Stabilité des tests signalés, avec la charge par défaut (nombre de processus de Playwright par défaut) :
    - `npx playwright test -g "ct_62|ct_10" --repeat-each=10` → 440 réussis sur 440 (ct_62 avec profils persistants et ct_10, sur les deux profils) ;
    - `npx playwright test tests/acceptance/modes.spec.ts --repeat-each=3` → 162 réussis sur 162.
    - Aucune instabilité reproduite.
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat (7 règles, 56 fichiers), lancé après les tests et non en parallèle ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté ici : la CI GitHub (WebKit, gitleaks, osv-scanner).
- **Verdict** : APPROUVE

Traitement de la revue de LOT-06 et décisions de l'équipe projet :
- Mineur 1 (remplacement d'un fichier existant) : tranché par l'équipe projet (HYP-50, RG-69 et ENF-15 en v1.4). `SECURITY.md` et le commentaire de `save-io.ts` disent désormais que le jeu ne remplace jamais un fichier de lui-même, et seulement sur choix et confirmation du joueur. Reste la traçabilité d'EF-23 CA-4 (constat 1).
- Mineur 2 (icône « ! ») : traité sur les erreurs d'E11 (E-01, E-02, E-03, E-04, E-07) et sur E-05 (`notice.ts`), et vérifié par `expectErrorIcon`.
- Suggestion 3 : traitée. Le champ de fichier passe par `createElement`, et `accept` est ajouté à la liste fermée des attributs. Un test vérifie qu'aucun écran n'utilise plus `document.createElement` (`construction-dom.test.ts`).
- HYP-51 : le nombre de bonbons mangés par partie est borné à 9 999 (`LIMITS.candiesEatenMax`, validateur, `toPendingGame`), jamais tronqué en dessous. Le score est borné à 9 999 avant l'insertion au tableau. Un test d'acceptation (`ct_62`, Zen de plus de 288 bonbons) vérifie le compte exact après fermeture, clôture unique et restauration.
- Reports à ce lot, tous testés :
  - EF-26 CA-2 : chrono figé pendant une interruption de 2 minutes, 35 s affichées puis 35 s de jeu (`ct_26`, en unitaire et dans le navigateur) ;
  - CT-09 : verrou d'écran tenu 5 minutes de Zen sans toucher, relâché en pause, redemandé à la reprise ;
  - RG-40 : « Nouveau mode découvert : Constellation » à la fin de la 3e partie, et au lancement après une partie interrompue ;
  - bruitages et vibration des modes : 80 ms et bruitage du bonbon spécial, bruitage de la constellation complétée, sans vibration.
- RG-42 (constellation dans le décor) : hors lot, en LOT-08.

Conformité aux critères de fin de LOT-07 :
- Chaque CA d'EF-01 (liste de 7 emplacements, mode mystère verrouillé, focalisable, `aria-disabled`, message sans partie) et d'EF-10 à EF-15 a son test sur le moteur, avec graine et temps simulé, et ceux qui en dépendent sont confirmés dans le navigateur. Cela couvre :
  - chrono figé pendant 2 minutes ;
  - 7 astéroïdes au 20e bonbon et jamais plus de 30 ;
  - 200 apparitions à 4 cases au moins de la tête ;
  - trous noirs placés dans leur zone, à 4 cases au moins les uns des autres ;
  - téléportation dans les deux sens, collision et bonbon sur la case de sortie ;
  - remplacement des effets, Inversion jugée sur la direction effective, Rétrécissement à 4 cases au moins ;
  - durée de vie du bonbon spécial figée en pause ;
  - traversée des bords et du corps en Zen ;
  - points et remise à zéro de la Constellation.
- Reproductibilité : pour chaque mode, deux parties avec la même graine et les mêmes commandes donnent les mêmes bonbons, astéroïdes, trous noirs et bonbons spéciaux à chaque pas (`ct_90`).
- Endurance : 2 heures de jeu simulé réparties sur les 7 modes, 50 cycles de pause, invariants toujours vrais et temps figé en pause (`ct_89`).
- Contrastes calculés : astéroïde et cratères, halos des deux paires contre le décor et le centre sombre, pictogramme blanc cerné de sombre sur les quatre couleurs (`ct_107`).
- Analyse axe sans violation sérieuse ni critique sur E2 (mode mystère verrouillé, puis découvert), E3 (chrono, effet en cours, constellation à tracer) et E6 (annonce de découverte).

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | `docs/projet/07-cahier-de-recette.md` (CT-50, CT-51, matrice § 3.1) ; `tests/acceptance/sauvegarde.spec.ts` (`ct_51`) | EF-23 CA-4 (remplacement confirmé ou refusé dans la fenêtre d'enregistrement), ajouté en v1.4, n'est rattaché à aucun CT de 07 ni à aucun test nommé. Les deux branches sont couvertes en substance par le sélecteur simulé de `ct_51` (annulation : rien n'est écrit, aucun message ; écriture complète sous le nom choisi), mais rien ne les relie au CA. | Faire ajouter EF-23 CA-4 à CT-51 (et à la vérification sur téléphone, CT-102), et ajouter à `ct_51` un cas explicite « fichier existant choisi, remplacement confirmé ou refusé » avec le sélecteur simulé. |
| 2 | SUGGESTION | `src/core/engine.ts:234-243` | `playFrame` fait les pas dus avant de compter le temps de l'image. Dans une même image, un pas peut donc avoir lieu juste après les 60 s de Contre la montre (au plus un pas, soit 125 ms). Sans effet sur les CA, testés à la seconde, ni sur ENF-06. | Compter le temps avant les pas, ou arrêter les pas dès que la limite est atteinte, si l'on veut une fin à l'image près. |

Points positifs :
- Le moteur reste générique et lisible : chaque mode est un objet de règles court (`setup`, `afterEat`, `points`, `wraps`, `timeLimitMs`, `candyColors`), sans branche par mode dans le moteur. Les événements (`eat`, `special`, `constellation`, `effect-end`) découplent sons, vibrations et annonces.
- Toutes les valeurs des modes sont dans `rules.ts` (ENF-19). Le hasard passe par la graine dans un ordre fixe, et les placements (astéroïdes, trous, bonbons spéciaux) réutilisent `pickFreeCell`, donc jamais sur une case occupée.
- Les tests sont représentatifs et stables. Le pilote de recette mène le serpent dans le navigateur contre un astéroïde, dans un trou noir, sur un bonbon spécial. Les répétitions sous charge par défaut sont toutes vertes.
- Les décisions de l'équipe projet sont intégrées avec soin : borne de 9 999 sans troncature silencieuse, icône d'erreur partout, construction du DOM centralisée.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

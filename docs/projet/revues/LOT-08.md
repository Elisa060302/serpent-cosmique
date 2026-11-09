# Revue de code — LOT-08

## Itération 1 — 2026-11-08
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-07 » :
  - moteur : `src/core/{color,engine,progress,rules,skins}.ts` ;
  - interface : `src/ui/render/{snake,decor,trail,preview,board}.ts`, `src/ui/screens/{skins,game,menu}.ts`, `src/ui/texts.ts`, `src/main.ts`, `public/styles.css` ;
  - documentation : `README.md`, 07 v1.3 ;
  - tests : `tests/acceptance/{skins,sauvegarde,progression}.spec.ts`, `tests/acceptance/support/{fichiers,jeu}.ts`, `tests/support/canevas.ts`, `tests/unit/{rendu-skins,skins,contrastes,contre-la-montre,textes,validation}.test.ts`.
- **Tests exécutés**, sur une machine sans autre charge :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 565 réussis, 0 échoué ; couverture de `src/core` : lignes 99,6 %, branches 95,7 %, fonctions 99,4 % ;
  - **suite complète** : `npm run test:e2e` (navigateurs Playwright installés localement) → construction puis **502 réussis, 0 échoué**, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium) ;
  - stabilité sous charge par défaut : `npx playwright test tests/acceptance/skins.spec.ts --repeat-each=3` → 240 réussis sur 240.
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat (7 règles, 59 fichiers), lancé après les tests ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté ici : la CI GitHub (WebKit, gitleaks, osv-scanner).
- **Verdict** : APPROUVE

Traitement de la revue de LOT-07 et cas ajoutés par 07 v1.3 :
- Mineur 1 (EF-23 CA-4) : traité. CT-51 couvre désormais CA-4 (étapes 6 à 8) et CT-102 la vérification sur téléphone. `ct_51` teste le remplacement confirmé (le fichier choisi contient la nouvelle sauvegarde et se restaure), le remplacement refusé (fichier existant intact, rien d'écrit, aucun message) et le téléchargement, qui ne remplace jamais.
- Suggestion 2 (fin de Contre la montre) : traitée. `playFrame` ne fait plus aucun pas dans l'image où la limite est atteinte, ce qui est testé dans `ct_25`.
- `ct_50` : dix sauvegardes successives donnent dix noms distincts, sans qu'aucun fichier antérieur soit modifié ni supprimé.
- `ct_62` (HYP-51) : une partie Zen interrompue à 400 bonbons en ajoute 400, et 9 999 sont acceptés en entier. Avec 10 000 et -1, l'état est refusé : rien n'est compté, et le jeu démarre normalement.
- `ct_118` : les valeurs 0, 288, 289 et 9 999 sont acceptées ; 10 000, -1, 1,5 et `NaN` sont refusées.

Points d'attention :
- **RM-07, RG-18 (la couleur suit toujours les bonbons)** :
  - toutes les formes et tous les motifs sont dessinés à partir de `snakeColorHex` (couleur du dernier bonbon ou teinte de l'arc-en-ciel) et de `nuance()`, qui ne mélange que du blanc. Seuls font exception le contour blanc et les yeux, communs à tous les skins ;
  - tests unitaires : les 16 combinaisons de forme et de motif, par lecture de pixels du canevas, n'emploient que la couleur, ses nuances et le blanc ;
  - tests d'acceptation : chaque forme et chaque motif est rose au départ, puis violet, rose clair, bleu clair et arc-en-ciel. Les traînées utilisent elles aussi les nuances de la couleur courante.
- **Contrastes des 4 décors** :
  - calculés pour chaque décor : chaque élément de jeu (bonbons, arc-en-ciel, astéroïde, halos, contour, pictogramme) a au moins 3:1 avec la base, les textes 4,5:1, et les nuances des motifs 3:1 ;
  - tous les détails (quadrillage, étoiles, scintillement, nuages, planète, bande, ciel de la Constellation) restent à une luminance de 0,08 au plus, sous la limite de 05 § 7.1 ;
  - le décor dessiné est vérifié dans le navigateur ;
  - le scintillement change d'état toutes les 700 ms (moins de 3 fois par seconde), il est figé en pause et avec le mouvement réduit.
- **RG-42** : chaque suite complétée ajoute au ciel du décor une constellation dessinée dans la couleur des détails (12 au plus). Elle est purement visuelle et se conserve après un changement de taille de l'écran (`ct_33`).
- **Écran Skins (accessibilité)** :
  - onglets `role="tab"` avec un seul arrêt de tabulation et les flèches du clavier ;
  - lignes `role="radio"` dans un `radiogroup` par onglet ;
  - état écrit (« Choisi » avec coche, « Débloqué », « Verrouillé » avec cadenas) ;
  - skin verrouillé `aria-disabled`, focalisable, dont le toucher met en évidence et annonce la condition et la progression sans rien choisir ;
  - aperçus dessinés en rose de départ ;
  - analyse axe sans violation sérieuse ni critique dans chaque onglet et dans tous les états.
- **`force: true`** sur les skins verrouillés (et sur le « Mode mystère » de LOT-07) : accepté. Playwright tient un élément `aria-disabled="true"` pour désactivé et refuse de le toucher. Or le toucher d'un élément `aria-disabled` est précisément le comportement exigé (05 § 4.8 et § 4.2). Les tests vérifient avant le toucher que l'élément est affiché, avec son texte, puis l'effet attendu (non choisi, mis en évidence, annoncé, stockage inchangé).
- **Écart déclaré de `ct_44`** (skin choisi pris dans le fichier à la restauration) : ce n'est pas un écart. RG-70 fixe que « skins choisis, réglages et dernier nom : ceux du fichier », et CT-44 n'attend que l'absence de retrait d'un skin débloqué. Le test le vérifie : « Poussière d'étoiles » reste débloquée, la traînée choisie devient celle du fichier (« Aucune »), et « Pois de sucre », venu du fichier, est ajouté.
- **EF-20** : CA-1 (Comète choisie, rose au départ dans la partie suivante), CA-2 (Fusée verrouillée : « 250 bonbons mangés au total » et « 63 / 250 bonbons », non choisie), CA-3 (« Retirer » donne « Aucune ») et la conservation après rechargement sont testés.

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | SUGGESTION | `src/ui/screens/skins.ts:43-54`, `:126-133` | Chaque `radiogroup` de skins expose 4 `role="radio"` tous dans l'ordre de tabulation, sans flèches du clavier. Le groupe « Commande » des réglages suit, lui, le motif ARIA depuis LOT-05. Le choix reste possible au clavier (Tab, puis Entrée). | Appliquer le même motif (un seul arrêt de tabulation, flèches), ou employer `role="button"` avec `aria-pressed` si le comportement radio n'est pas voulu. |
| 2 | SUGGESTION | `src/core/rules.ts` (`DECORS`), 05 § 7.1 | ENF-11 est satisfait au sens de 05 : contraste mesuré contre la base, détails à une luminance de 0,08 au plus. Mais un bonbon violet ou rose posé exactement sur un détail clair (nuage de Nébuleuse, planète) n'a plus qu'environ 2,4:1 à 2,7:1 avec ce détail. Le contour blanc de 1 px (au moins 3:1 sur tout détail, testé) maintient la distinction. | Rien à corriger dans ce lot ; vérifier la lisibilité sur captures des 4 décors en recette (CT-21, test à 3 personnes). |

Points positifs :
- Le rendu est construit pour respecter RM-07 par construction : une seule source de couleur (`snakeColorHex`), une seule façon d'éclaircir (`nuance`), et l'ordre de dessin du fond vers l'avant (décor, scintillement, traînée, trous, astéroïdes, bonbons, serpent), vérifié par lecture de pixels.
- Toutes les valeurs des décors, du scintillement, du ciel, des traînées et des nuances sont dans `rules.ts` (ENF-19), et testées contre les limites de 05.
- Les tests de pixels sont précis et reproductibles : 16 combinaisons de forme et de motif, traînée jamais sur le serpent, décor sans traînée.
- Les mineurs et suggestions des lots précédents sont traités ; la suite complète est verte.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

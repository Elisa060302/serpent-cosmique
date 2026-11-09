# Conception UX — Serpent Cosmique

| Version | Date | Sources |
|---|---|---|
| 1.0 | 2026-11-02 | 01 v1.0, 02 v1.1, 03 v1.0 |

Cohérence avec 02 v1.1 relue en fin de conception : l'écran « À propos » suit RG-64, EF-29 (RG-89 à RG-92) et 03 § 7.3 (ADR-04) ; l'erreur E-06 et la limite de 256 Kio (sans effet sur les textes d'E-01) sont prises en compte. Les libellés de référence de 02 sont repris tels quels, sauf mention contraire (§ 5).

## 1. Principes
- **Public** : adultes à l'aise avec un téléphone, qui jouent à l'horizontale, souvent hors ligne, parfois à plusieurs sur le même téléphone. Aucun n'a vu le jeu avant.
- **Ton** : court, direct, vouvoiement, verbes d'action (« Jouer », « Reprendre », « Créer une sauvegarde »). Pas de jargon : « sauvegarde », « mise à jour », jamais « cache », « agent de service » ou « IndexedDB ».
- **Réussite sans aide** : lancer une partie en 2 touchers (« Jouer », puis le mode) ; comprendre un mode en le lisant dans la liste ; créer ou restaurer une sauvegarde en 2 touchers depuis le menu (ENF-10).
- **Aide intégrée** : la règle de chaque mode est dans la liste des modes ; le rappel de commande est dans le compte à rebours ; chaque condition de skin est affichée avec sa progression ; chaque erreur dit ce qui s'est passé, ce qui est intact et quoi faire.
- **Sécurité des gestes** : une seule action destructrice dans le jeu, « Abandonner » (confirmation, « Non » proposé par défaut). La restauration modifie la progression : résumé et confirmation avant. Aucun écran ne supprime de données.
- **Bouton retour du téléphone hors partie** (01 HYP-45) : il agit comme « ‹ Retour » sur les écrans secondaires (retour à l'écran précédent) et, sur le menu principal, quitte le jeu. Pendant une partie, il ouvre la pause (E5). Sur l'écran de fin avec saisie du nom, il garde le nom déjà enregistré et revient au menu (RG-53, RG-95). Cohérence vérifiée avec RG-95 et EF-01 CA-4 (Records → retour → menu → retour → le jeu se ferme).
- **Orientation** : paysage uniquement (RG-80, RG-81). Tout écran hors partie peut défiler verticalement quand le contenu dépasse (iPhone SE de 3e génération : 667 × 375 px CSS).
- **Aucune fonction ni écran en plus de 02 et 03** : les écrans de l'inventaire (§ 3) servent chacun une EF ; les deux éléments issus de 03 sont « À propos » (mise à jour, état hors ligne) et le panneau « Installer le jeu ».

## 2. Parcours
| Profil | Parcours | Étapes (nominal) | Erreurs et reprises prévues |
|---|---|---|---|
| Joueur (SCN-01) | Première partie | 1. Ouvrir le jeu → menu. 2. « Jouer ». 3. « Classique » (la partie démarre : 2 touchers). 4. Compte à rebours 3-2-1 avec rappel de la commande. 5. Jouer. 6. Écran de fin : raison, score, « Nouveau record ! », champ « Votre nom » prérempli. 7. « Valider » (facultatif : le record est déjà enregistré, RG-53), puis « Rejouer » ou « Menu » | Demi-tour ou commande en trop : ignorés sans message (RG-26). Téléphone tenu à la verticale : « Tournez votre téléphone à l'horizontale » et pause. Nom vide : devient « Joueur ». 13e caractère refusé avec le message « 12 caractères au maximum » |
| Joueur | Interruption (SCN-05) | Appel, notification, verrouillage, changement d'application, bouton retour : pause immédiate. Au retour : écran « Pause » → « Reprendre » → 3-2-1 → le serpent repart | Jeu fermé de force : au lancement suivant, message « Votre dernière partie (<mode>, <score> points) a été interrompue ; elle a été enregistrée. », puis saisie du nom si record, puis menu |
| Joueur | Changer la commande et le son (SCN-02) | Menu → « Réglages » → « Flèches » ; interrupteur « Musique » sur « Coupée » ; « Retour » | Vibrations indisponibles (iPhone) : ligne grisée avec explication. Les réglages sont enregistrés à chaque toucher, aucun bouton « Enregistrer » |
| Joueur | Choisir un skin (SCN-03) | L'écran de fin annonce « Nouveau skin débloqué : <nom> » → Menu → « Skins » → catégorie → toucher le skin → « Choisi » | Skin verrouillé touché : rien n'est choisi, la condition et la progression s'affichent. « Retirer » rend le skin par défaut |
| Joueur | Consulter les records | Menu → « Records » → flèches ‹ › pour changer de mode | Mode jamais joué : « Aucun record pour l'instant » |
| Demandeur | Créer une sauvegarde | Menu → « Sauvegarde » → « Créer une sauvegarde » → (sélecteur du téléphone si proposé) → « Sauvegarde créée : <nom du fichier> » | Annulation du sélecteur : aucun message. E-03 (place) et E-04 (écriture) : la progression est intacte, bouton « Réessayer » |
| Demandeur | Restaurer (SCN-04) | Menu → « Sauvegarde » → « Restaurer une sauvegarde » → choix du fichier → résumé et « Fusionner avec la progression de ce téléphone ? » → « Fusionner » → « Restauration terminée : N records, M skins débloqués. » | Fichier invalide : E-01 ; plus récent : E-02 ; rien n'est modifié dans les deux cas. « Annuler » : rien n'est modifié. Fermeture pendant la fusion : état d'avant (RG-73) |
| Demandeur | Mettre à jour | Menu (repère « Mise à jour » sur « Réglages ») → « Réglages » → « À propos » → « Installer » → attente → le jeu se recharge → « Serpent Cosmique a été mis à jour en version X.Y.Z. Votre progression est conservée. » | Pas de réseau ou empreinte fausse : E-06, l'ancienne version reste en place, bouton « Réessayer ». Aucune mise à jour pendant une partie (elle n'est proposée que dans les menus) |
| Ami (SCN-06) | Installer le jeu | Ouvrir le lien dans le navigateur → menu → bandeau « Installer le jeu » → panneau avec 3 étapes selon le téléphone (Android : bouton « Installer le jeu » quand le navigateur le propose ; iPhone : Partager, « Sur l'écran d'accueil », « Ajouter ») → ouvrir le jeu depuis l'icône → message « Prêt à jouer hors ligne » | Navigateur sans invite d'installation : étapes écrites avec le menu ⋮. iPhone : bouton Partager introuvable en paysage → conseil de tenir le téléphone à la verticale le temps de l'installation. Installation non terminée : « À propos » affiche « Préparation du mode hors ligne… » |

Étapes supprimées : pas d'écran d'accueil ni de tutoriel (les règles sont dans la liste des modes) ; pas de bouton « Enregistrer » dans les réglages ; pas de confirmation pour « Rejouer », « Reprendre » ni pour un choix de skin (réversible) ; saisie du nom facultative (déjà enregistré).

## 3. Inventaire des écrans
| Écran | Exigences servies | Rôle |
|---|---|---|
| E1 Menu principal | EF-01, EF-29 (repère), 03 § 7.1 (bandeau d'installation) | Point d'entrée : Jouer, Records, Skins, Réglages, Sauvegarde |
| E2 Choix du mode | EF-01, EF-15 | Liste des 7 modes avec leur règle ; lancement en un toucher |
| E3 Partie (aire de jeu, bandeau d'information, flèches en option) | EF-02 à EF-14, EF-06, EF-07, EF-08 | Jouer |
| E4 Compte à rebours (départ et reprise) | EF-02 (RG-05), EF-25 (RG-76) | 3-2-1 avec rappel de la commande |
| E5 Pause et confirmation d'abandon | EF-25, EF-26, EF-14 | Reprendre ou abandonner |
| E6 Fin de partie (avec saisie du nom) | EF-16, EF-18, EF-19, EF-15 | Résultat, record, déblocages, rejouer |
| E7 Records | EF-17 | Tableau des 10 meilleurs par mode |
| E8 Skins | EF-19, EF-20 | Voir, choisir, retirer |
| E9 Réglages | EF-21, EF-22 | Commande, bruitages, musique, vibrations, entrée vers « À propos » |
| E10 À propos | EF-21 (RG-64), EF-29, 03 § 7.3 | Version, état hors ligne, mise à jour consentie |
| E11 Sauvegarde (créer, restaurer, résumé de restauration) | EF-23, EF-24 | Fichier de progression |
| E12 Tournez votre téléphone | EF-28 (RG-81) | Seul contenu affiché en orientation verticale |
| E13 Messages au lancement (partie interrompue, progression illisible) | EF-27, RG-84 | Informer avant le menu |
| E14 Panneau « Installer le jeu » | 03 § 7.1 (ENF-01) | Guide d'installation dans le navigateur |

Éléments communs : barre d'en-tête (« ‹ Retour » à gauche, titre), boîte de dialogue (pause, confirmations, messages), message passager en bas d'écran (confirmations, erreurs légères).

## 4. Maquettes en fil de fer
Conventions : `[ ]` bouton (hauteur 11 mm au moins, zone tactile d'au moins 9 mm), `( )` choix exclusif, `[x]` interrupteur ; `░` zone de la grille. Maquettes dessinées pour 780 × 360 px CSS (S22) ; sur iPhone SE les mêmes blocs sont réduits en largeur (§ 4.3).

### 4.1 E1 Menu principal
```
+--------------------------------------------------------------+
|  SERPENT COSMIQUE                      [ Records           ] |
|                                        [ Skins             ] |
|  [        JOUER        ]               [ Réglages  (Mise à  ] |
|                                        [           jour)   ] |
|  Pour jouer hors ligne, installez      [ Sauvegarde        ] |
|  le jeu.  [ Installer le jeu ]                               |
+--------------------------------------------------------------+
```
- « Jouer » : bouton principal, plus grand (16 mm de haut). Les quatre autres : colonne de boutons secondaires de 10 mm.
- Le bandeau « Installer le jeu » n'existe que si le jeu est ouvert dans le navigateur (pas installé) ; il disparaît dans l'application installée.
- L'étiquette « Mise à jour » sur « Réglages » (texte, pas seulement un point) n'existe que si une nouvelle version est disponible.
- États : premier lancement identique aux suivants. Focus : contour blanc de 3 px.

### 4.2 E2 Choix du mode
```
+--------------------------------------------------------------+
| [‹ Retour]   Choisissez un mode                              |
|--------------------------------------------------------------|
| [ Classique        | Mangez les bonbons pour grandir. Le     ]|
| [                  | serpent accélère peu à peu : ne touchez ]|
| [                  | ni les bords ni votre queue.            ]|
| [ Contre la montre | Mangez un maximum de bonbons en 60 s... ]|
| [ Champ d'astéroïdes | ...                                   ]|
| ...(défilement)                                              |
| [ Mode mystère  🔒 | Jouez encore 2 parties pour le découvrir]|
+--------------------------------------------------------------+
```
- Chaque ligne est un seul bouton : nom à gauche, règle à droite (libellés RG-03, 200 caractères au plus). Un toucher lance la partie.
- Ordre de RG-02. Le « Mode mystère » est un bouton marqué `aria-disabled` (donc lu et focalisable) avec un cadenas et le texte « Jouez encore N parties pour le découvrir » ; le toucher affiche ce même message en message passager, sans lancer de partie. Une fois découvert : « Constellation » avec sa règle.
- Une ligne en partie visible en bas de la zone indique qu'on peut défiler.

### 4.3 E3 Partie
Mode « Glissement » :
```
+--------------------------------------------------------------+
| Score 12        Temps 35 s  ou  Effet : Inversion 5 s    [II]|
|--------------------------------------------------------------|
|   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   |
|   ░░░░░░░░░░░░░░░ grille 24 × 12 ░░░░░░░░░░░░░░░░░░░░░░░░░   |
|   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   |
+--------------------------------------------------------------+
```
Mode « Flèches » (le bandeau reste en haut ; la grille est encadrée de deux colonnes de 12 mm) :
```
+--------------------------------------------------------------+
| Score 12        Temps 35 s                               [II]|
|--------------------------------------------------------------|
| [ ▲ ]  ░░░░░░░░░░░░░░░░ grille 24 × 12 ░░░░░░░░░░░  [ ◀ ]    |
| [Haut] ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ [Gauche] |
| [ ▼ ]  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  [ ▶ ]    |
| [Bas]                                              [Droite]  |
+--------------------------------------------------------------+
```
- **Bandeau d'information** (hauteur 9,5 mm, hors grille, RG-04) : score à gauche (24 px gras) ; au centre, l'information du mode : « Temps 35 s » (Contre la montre), « Effet : <nom> <n> s » avec pictogramme (Bonus et pièges ; absent sans effet), la constellation à tracer (Constellation : trois silhouettes de bonbons dans l'ordre, la couleur attendue entourée d'un cadre épais et nommée « Prochain : violet ») ; bouton pause à droite : symbole « II » suivi du mot « Pause » (écart accepté par la revue de LOT-02) ; le nom accessible est le texte visible (WCAG 2.5.3) et la cible fait au moins 9 mm de haut et de large (réalisée à 90 × 60 px). Le bandeau est construit en DOM (texte par `textContent`, bouton natif) et non sur le canevas : écart accepté par la revue de LOT-02, qui prévaut sur le § 7.3.
- **Flèches** : chaque flèche mesure 12 mm de large et 20 mm de haut au plus, porte un pictogramme et son nom (« Haut », « Bas », « Gauche », « Droite »). Colonne gauche : Haut au-dessus de Bas ; colonne droite : Gauche au-dessus de Droite (HYP-34). Retour visuel au toucher en 100 ms au plus : la flèche s'inverse (fond clair, symbole sombre) et son contour s'épaissit, donc pas seulement un changement de couleur. Aucune flèche ne recouvre une case (CA-3 d'EF-07).
- **Glissement** : toute la zone de jeu, hors bouton pause, reçoit le geste. Aucun élément cliquable sur la grille.
- **Tailles de case** (règle de calcul de 03 § 3.2 : 1 mm = 6,3 px CSS pour les seuils ; case = plus grande taille entière tenant dans la zone sûre, une fois retirés le bandeau de 60 px et, en « Flèches », deux colonnes de 80 px) :

| Appareil (paysage) | Commande | Largeur permise | Hauteur permise | Case | Taille réelle | Exigence |
|---|---|---|---|---|---|---|
| S22 (780 × 360 px CSS, 0,18 mm/px) | Glissement | 32 px | 24 px | 24 px | 4,3 mm | 4 mm : tenue |
| S22 | Flèches | 25 px | 24 px | 24 px | 4,3 mm | 4 mm : tenue |
| iPhone SE 3 (667 × 375 px, 0,156 mm/px) | Glissement | 27 px | 25 px | 25 px | 3,9 mm | 3 mm : tenue |
| iPhone SE 3 | Flèches | 21 px | 25 px | 21 px | 3,3 mm | 3 mm : tenue, peu de marge |

  Réponse au risque des petites cases : (1) le bandeau est placé au-dessus de la grille, dans la hauteur disponible, donc sans coût en largeur ; (2) les flèches sont empilées par deux dans deux colonnes étroites plutôt que posées en croix (une croix coûterait environ 36 mm de large : cases de 2,6 mm) ; (3) en « Glissement » (réglage par défaut), toute la largeur sert à la grille ; (4) le jeu n'affiche jamais une grille dont la case mesure moins de 19 px : si le calcul passait sous ce seuil, il retire la marge intérieure des colonnes avant de réduire la case, sans jamais descendre les flèches sous 12 mm. Les mesures réelles se font en recette (ENF-04, R-13). Dans « Réglages », sous « Flèches », une phrase prévient : « Avec les flèches, la grille est un peu plus petite. »
- **Dessin** : chaque élément a un contour fin clair et une silhouette simple lisible à 3 mm ; la tête du serpent est marquée par deux yeux et un léger agrandissement ; la grille est sous-entendue par un quadrillage très discret (non porteur d'information).
- **Veille et verrouillage** : aucun élément propre à l'interface (voir EF-02 RG-10 ; pause automatique, EF-26).

### 4.4 E4 Compte à rebours
```
+--------------------------------------------------------------+
|  (bandeau et grille visibles, serpent immobile)              |
|                       +-----------+                          |
|                       |     3     |   grand chiffre 72 px    |
|                       +-----------+                          |
|     Glissez le doigt pour diriger le serpent                 |
+--------------------------------------------------------------+
```
- Chiffre et phrase sur un panneau opaque foncé (contraste 4,5:1 au moins) ; la phrase est « Utilisez les flèches pour diriger le serpent » en mode « Flèches ». À la reprise, la phrase est « Reprise de la partie » (même panneau).
- Les commandes reçues pendant le compte à rebours sont gardées (RG-27). Le chiffre est annoncé aux lecteurs d'écran à chaque seconde.

### 4.5 E5 Pause et abandon
```
+--------------------------------------------------------------+
|  (grille visible, assombrie)                                 |
|             +--------------------------------+               |
|             |             Pause              |               |
|             |   [        Reprendre        ]  |               |
|             |   [       Abandonner        ]  |               |
|             +--------------------------------+               |
+--------------------------------------------------------------+

             +--------------------------------------+
             |  Abandonner la partie ?              |
             |  Votre score de 9 points sera        |
             |  conservé.                           |
             |     [  Non  ]     [  Oui  ]          |
             +--------------------------------------+
```
- Le focus clavier arrive sur « Reprendre », puis sur « Non » dans la confirmation (choix sûr par défaut). Échap équivaut à « Reprendre » dans la pause et à « Non » dans la confirmation.
- Pause automatique : même écran, avec au-dessus du titre : « Partie mise en pause » (sans autre explication). En mode Zen, la phrase « Quittez quand vous voulez avec le bouton pause » est rappelée dans la liste des modes, pas ici.
- Le bouton retour du téléphone ouvre cet écran ; il ne ferme pas le jeu (RG-74).

### 4.6 E6 Fin de partie
```
+--------------------------------------------------------------+
|  Classique                                                   |
|  Collision                          Votre nom                |
|  Score   11                         [ Coco            ] 4/12 |
|  ★ Nouveau record !  (3e)           Nom enregistré : Coco.   |
|                                     [     Valider     ]      |
|  Nouveau skin débloqué : Comète                              |
|  Nouveau mode découvert : Constellation                      |
|                                     [  Rejouer  ] [  Menu  ] |
+--------------------------------------------------------------+
```
- Raisons (RG-44) : « Collision », « Temps écoulé », « Victoire ! L'aire de jeu est pleine. », « Partie abandonnée ».
- Le bloc « Votre nom » n'existe que si le score entre au tableau. Le champ est prérempli avec le dernier nom, sans focus automatique (le clavier du téléphone ne s'ouvre pas tout seul et ne masque pas le résultat) ; la touche d'action du clavier est « Terminé » et valide. Quand le champ a le focus, la page défile pour garder le champ et « Valider » visibles au-dessus du clavier. Compteur « n/12 » ; au 13e caractère : message passager « 12 caractères au maximum ».
- Règles de la saisie du nom (RG-50, RG-53) : le champ est prérempli avec le dernier nom enregistré, c'est-à-dire le nom finalement enregistré au record précédent ; il est vide au tout premier record du téléphone, et le record est alors enregistré au nom « Joueur » (la ligne d'aide dit « Nom enregistré : Joueur. Touchez le champ pour en saisir un autre. »). Seul « Valider » remplace le nom déjà enregistré par le nom saisi. Quitter l'écran autrement (« Rejouer », « Menu », bouton retour du téléphone, fermeture du jeu) garde le nom prérempli déjà enregistré : un texte tapé mais non validé n'est pas retenu, et la ligne d'aide rappelle « Touchez « Valider » pour enregistrer ce nom. » dès que le texte du champ diffère du nom enregistré. Le nom enregistré (y compris « Joueur ») devient le dernier nom proposé au record suivant. Le bouton retour du téléphone sur cet écran quitte l'écran de fin vers le menu, comme « Menu » (RG-95).
- Après « Valider » : le bloc devient « Nom enregistré : Léa » (texte) et le focus passe sur « Rejouer ».
- **Erreur E-08** (RG-93) : si la progression n'a pas pu être enregistrée en fin de partie (espace plein, stockage refusé), l'écran de fin s'affiche quand même, avec tous ses éléments et ses boutons actifs. Le message « La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08) » apparaît dans le message passager du bas d'écran, avec l'icône « ! » et son code, sans bouton ni boîte de dialogue, et disparaît de lui-même après 8 secondes (fermable d'un toucher ; annoncé en zone vivante polie, sans voler le focus). Le même message passager s'affiche sur tout autre écran après un échec d'enregistrement (réglage, choix de skin) ; il ne réapparaît plus dès qu'un enregistrement réussit.
- « Nouveau record ! » est précédé d'une étoile et accompagné du rang ; la couleur ne porte aucune information.
- Les lignes « Nouveau skin débloqué » et « Nouveau mode découvert » n'existent que si un déblocage a eu lieu.
- Variante au lancement après interruption : même écran, raison « Partie abandonnée », précédé de la boîte de dialogue E13.

### 4.7 E7 Records
```
+--------------------------------------------------------------+
| [‹ Retour]   [‹]  Classique  [›]                             |
|--------------------------------------------------------------|
| 1. Coco     42  01/11/2026        6. Léa      18  30/10/2026 |
| 2. Léa      35  01/11/2026        7. ...                     |
| 3. ...                            ...                        |
| 5. ...                           10. ...                     |
+--------------------------------------------------------------+
```
- Les boutons ‹ et › (noms accessibles « Mode précédent », « Mode suivant ») font défiler les modes disponibles, en boucle ; le nom du mode est annoncé. Rangs 1 à 5 à gauche, 6 à 10 à droite (liste ordonnée, lue de 1 à 10).
- Chaque ligne : rang, nom (texte brut, coupé à 12 caractères, jamais interprété), score, date JJ/MM/AAAA. Tableau vide : « Aucun record pour l'instant » au centre.

### 4.8 E8 Skins
```
+--------------------------------------------------------------+
| [‹ Retour] Skins   (Forme)(Motif)(Traînée)(Décor)            |
|--------------------------------------------------------------|
| [aperçu] Anneaux        Choisi            [ Retirer ]        |
| [aperçu] Comète         Débloqué                             |
| [aperçu] Fusée    🔒 Verrouillé                              |
|          250 bonbons mangés au total — 63 / 250 bonbons      |
| [aperçu] Soucoupe 🔒 Verrouillé                              |
|          1 000 bonbons mangés au total — 63 / 1 000 bonbons  |
+--------------------------------------------------------------+
```
- Les quatre catégories sont des onglets (une seule active, soulignée et en gras). Une ligne par skin : aperçu (dessiné dans la couleur rose de départ, sans quoi le skin paraîtrait gratuitement coloré), nom, état en texte : « Choisi » (avec coche), « Débloqué », « Verrouillé » (avec cadenas).
- Un skin débloqué se choisit en le touchant (état « Choisi », enregistré aussitôt, message passager « Skin choisi : Comète. Il sera utilisé à la prochaine partie. »). Un skin verrouillé touché ne se choisit pas : sa condition et sa progression (« meilleur score : 9 / 15 ») sont déjà affichées, le toucher les met en évidence et les annonce.
- « Retirer » apparaît sur le skin choisi quand il n'est pas celui par défaut ; il remet le skin par défaut de la catégorie (« Aucune » pour la traînée, par exemple).

### 4.9 E9 Réglages
```
+--------------------------------------------------------------+
| [‹ Retour]   Réglages                                        |
|--------------------------------------------------------------|
| Commande                         Sons                        |
| (•) Glissement                   Bruitages   [x] Activés     |
|     Glissez le doigt sur l'écran Musique     [ ] Coupée      |
| ( ) Flèches                      Vibrations  [x] Activées    |
|     Quatre flèches à l'écran.                                |
|     La grille est un peu plus    [ À propos            › ]   |
|     petite.                                                  |
+--------------------------------------------------------------+
```
- Les interrupteurs sont de vrais contrôles à coche (rôle `switch`) : l'état est écrit (« Activés » / « Coupée ») et dessiné par la position et la coche, pas seulement par la couleur. Toucher la ligne entière bascule le réglage.
- Vibrations indisponibles : ligne grisée, interrupteur désactivé, texte « Non disponible sur ce téléphone » (contraste du texte gardé à 4,5:1 : le grisé ne s'applique qu'au contrôle).
- La commande s'applique à la partie suivante (phrase d'aide : « Le changement s'applique à la prochaine partie. ») ; la musique s'arrête dès qu'elle est coupée.
- « À propos » porte l'étiquette « Mise à jour » si une version est disponible.

### 4.10 E10 À propos
```
+--------------------------------------------------------------+
| [‹ Retour]   À propos                                        |
|--------------------------------------------------------------|
| Serpent Cosmique        Version 1.0.0        © CocoClaudo    |
| ✔ Prêt à jouer hors ligne                                    |
|                                                              |
| Mise à jour                                                  |
|  (état A) Vous avez la dernière version connue.              |
|  (état B) Nouvelle version 1.1.0 disponible.                 |
|           [ Installer ]                                      |
|           Votre progression est conservée.                   |
|           Conseil : créez d'abord une sauvegarde.            |
|  (état C) Installation en cours… Ne fermez pas le jeu.       |
|  (état D) ⚠ La mise à jour n'a pas pu être installée. ...    |
|           [ Réessayer ]                                      |
+--------------------------------------------------------------+
```
- **Version et état hors ligne** (RG-64) : nom, « Version X.Y.Z » (format de ENF-18), « © CocoClaudo ». État hors ligne en trois formulations : « ✔ Prêt à jouer hors ligne » ; « Préparation du mode hors ligne… Restez connecté » (installation incomplète) ; « Hors ligne non disponible : ouvrez le jeu une fois avec une connexion » (échec d'installation).
- **États de la mise à jour** : A (rien de nouveau connu) avec l'aide « Le jeu cherche une nouvelle version à son ouverture, quand le téléphone est connecté. Pour chercher maintenant : connectez le téléphone, fermez complètement le jeu, puis rouvrez-le. » (HYP-33) ; B (version disponible, RG-89) : bouton « Installer », rappel que la progression est conservée, lien « Créer une sauvegarde » vers E11 ; C (en cours) : bouton désactivé, message en zone vivante ; le jeu se recharge à la fin et affiche « Serpent Cosmique a été mis à jour en version X.Y.Z. Votre progression est conservée. » en message sur le menu ; D (échec) : E-06 et « Réessayer ». Rien ne s'installe sans le toucher du joueur ; il n'y a pas d'annulation en cours d'installation, mais l'ancienne version reste intacte si elle échoue.
- L'écran n'est accessible que depuis les menus : aucune mise à jour pendant une partie.

### 4.11 E11 Sauvegarde
```
+--------------------------------------------------------------+
| [‹ Retour]   Sauvegarde                                      |
|--------------------------------------------------------------|
| [ Créer une sauvegarde      ]  Enregistre vos records, skins |
|                                et réglages dans un fichier.  |
| [ Restaurer une sauvegarde  ]  Choisissez un fichier créé    |
|                                par ce jeu. Il sera fusionné  |
|                                avec la progression actuelle. |
+--------------------------------------------------------------+

Résumé de restauration (boîte de dialogue)
+------------------------------------------------------+
| Sauvegarde du 01/11/2026 à 14:30                     |
| 12 records, 7 skins débloqués.                       |
| Fusionner avec la progression de ce téléphone ?      |
| Vos records et skins actuels sont conservés. Les     |
| réglages et skins choisis du fichier remplaceront    |
| les vôtres.                                          |
|             [ Annuler ]      [ Fusionner ]           |
+------------------------------------------------------+
```
- Le résultat s'affiche en message passager restant 6 s (ou fermé par un toucher) et dans une zone vivante : « Sauvegarde créée : serpent-cosmique-sauvegarde-2026-11-01-1430.json » ; les erreurs sont durables jusqu'à la prochaine action (boîte avec « Compris » ou « Réessayer »). E-07 s'affiche dans cette même boîte, sur l'écran Sauvegarde, à la place du message « Restauration terminée… », après le toucher de « Fusionner » si l'enregistrement de la progression fusionnée échoue ; rien n'a changé.
- Sur iPhone, une ligne d'aide sous « Créer une sauvegarde » : « Dans la fenêtre qui s'ouvre, choisissez « Enregistrer dans Fichiers ». » Sur tout téléphone : « Ne restaurez que des fichiers que vous avez créés vous-même. »
- Le focus de « Annuler » est préféré à « Fusionner » à l'ouverture du résumé.

### 4.12 E12, E13, E14
```
E12                                   E13 (au lancement)
+------------------------------+      +--------------------------------------+
|        [icône téléphone      |      | Partie interrompue                   |
|         qui tourne]          |      | Votre dernière partie (Classique,    |
|  Tournez votre téléphone     |      | 12 points) a été interrompue ;       |
|  à l'horizontale             |      | elle a été enregistrée.   [Continuer]|
+------------------------------+      +--------------------------------------+

E14 Panneau « Installer le jeu »  (ouvert depuis le bandeau du menu)
+--------------------------------------------------------------+
| [‹ Retour]   Installer le jeu                                |
|--------------------------------------------------------------|
| Jouez sans connexion, comme avec une application.            |
| (Android avec invite)    [ Installer le jeu ]                |
| (sinon, Android)  1. Touchez ⋮ en haut à droite du navigateur|
|                   2. Touchez « Installer l'application »     |
|                   3. Ouvrez le jeu depuis son icône, avec une|
|                      connexion, jusqu'à « Prêt à jouer hors  |
|                      ligne ».                                |
| (iPhone)  1. Touchez Partager (carré avec une flèche vers le |
|              haut). Introuvable ? Tenez un instant le        |
|              téléphone à la verticale.                       |
|           2. Touchez « Sur l'écran d'accueil »               |
|           3. Touchez « Ajouter », puis ouvrez le jeu depuis  |
|              son icône avec une connexion.                   |
+--------------------------------------------------------------+
```
- E12 seule en orientation verticale ; le jeu en pause attend le retour à l'horizontale. Pas d'autre bouton.
- E13 : une boîte de dialogue. Juste sous le message de partie interrompue, et avant le bouton « Continuer », elle liste les déblocages obtenus par cette partie, comme sur un écran de fin : une ligne « Nouveau skin débloqué : <nom> » par skin et, le cas échéant, « Nouveau mode découvert : Constellation » (RG-58, RG-79, RG-40) ; aucune ligne s'il n'y a eu aucun déblocage. Si la liste dépasse la hauteur, la boîte défile. « Continuer » mène à E6 si un record a été créé, sinon au menu. Le message E-05 (progression illisible) utilise le même gabarit avec le bouton « Compris ».
- E14 : le téléphone est détecté (Android ou iPhone) ; seules les étapes de ce téléphone sont affichées (les autres derrière un lien « Autre téléphone »). Après installation (`appinstalled`) : « Jeu installé. Ouvrez-le depuis son icône sur l'écran d'accueil. » Sur iPhone, rappeler que ce premier lancement connecté est indispensable. Le panneau est une page, pas une fenêtre qui bloque : « Retour » le ferme ; il n'est jamais imposé (HYP-35).

## 5. Textes de l'interface
Tous les textes sont dans `ui/texts.ts` (EXS-12). Les libellés de 02 sont conservés sauf : « Oui » / « Non » inchangés ; ajout de l'état « Prêt à jouer hors ligne » (RG-64).

| Contexte | Texte |
|---|---|
| Menu | « Jouer », « Records », « Skins », « Réglages », « Sauvegarde » |
| Repère de mise à jour | « Mise à jour » |
| Bandeau d'installation | « Pour jouer hors ligne, installez le jeu. » / « Installer le jeu » |
| Choix du mode, titre | « Choisissez un mode » |
| Règles des modes | libellés de RG-03 (Classique, Contre la montre, Champ d'astéroïdes, Trou noir, Bonus et pièges, Zen, Constellation) |
| Mode verrouillé | « Mode mystère », « Jouez encore N parties pour le découvrir » (N = 1 : « Jouez encore 1 partie pour le découvrir ») |
| Compte à rebours | « 3 », « 2 », « 1 » ; « Glissez le doigt pour diriger le serpent » ; « Utilisez les flèches pour diriger le serpent » ; reprise : « Reprise de la partie » |
| Bandeau | « Score », « Temps 35 s », « Effet : Ralenti / Turbo / Inversion 5 s », « Rétrécissement » (annonce brève, effet immédiat), « Prochain : rose / violet / rose clair / bleu clair » |
| Pause | « Pause », « Partie mise en pause », « Reprendre », « Abandonner » |
| Confirmation d'abandon | « Abandonner la partie ? Votre score de N points sera conservé. » / « Non » / « Oui » |
| Fin de partie | « Collision », « Temps écoulé », « Victoire ! L'aire de jeu est pleine. », « Partie abandonnée », « Score », « Nouveau record ! », « Votre nom », « Valider », « Nom enregistré : <nom> », « Rejouer », « Menu », « Nouveau skin débloqué : <nom> », « Nouveau mode découvert : Constellation » |
| Champ du nom | aide : voir la ligne suivante ; « 12 caractères au maximum » ; nom vide devenu « Joueur » |
| Records | « Records », « Mode précédent », « Mode suivant », « Aucun record pour l'instant » |
| Skins | « Skins », « Forme », « Motif », « Traînée », « Décor », « Choisi », « Débloqué », « Verrouillé », « Retirer », « Skin choisi : <nom>. Il sera utilisé à la prochaine partie. », conditions de RG-54 avec progression (« 63 / 250 bonbons », « meilleur score : 9 / 15 ») |
| Réglages | « Réglages », « Commande », « Glissement », « Flèches », « Sons », « Bruitages », « Musique », « Vibrations », « Activés / Coupée », « Non disponible sur ce téléphone », « Le changement s'applique à la prochaine partie. », « Avec les flèches, la grille est un peu plus petite. », « À propos » |
| À propos | « Version X.Y.Z », « © CocoClaudo », « Prêt à jouer hors ligne », « Préparation du mode hors ligne… Restez connecté. », « Hors ligne non disponible : ouvrez le jeu une fois avec une connexion. », « Vous avez la dernière version connue. », « Nouvelle version X.Y.Z disponible. », « Installer », « Votre progression est conservée. », « Conseil : créez d'abord une sauvegarde. », « Installation en cours… Ne fermez pas le jeu. », « Serpent Cosmique a été mis à jour en version X.Y.Z. Votre progression est conservée. » |
| Erreur de mise à jour (E-06) | « La mise à jour n'a pas pu être installée. Votre version actuelle reste disponible. Réessayez avec une connexion. (E-06) » / « Réessayer » |
| Sauvegarde | « Sauvegarde », « Créer une sauvegarde », « Restaurer une sauvegarde », « Sauvegarde créée : <nom du fichier> », « Fusionner avec la progression de ce téléphone ? », « Fusionner », « Annuler », « Restauration terminée : N records, M skins débloqués. » |
| Erreur E-01 | « Ce fichier n'est pas une sauvegarde valide de Serpent Cosmique. Rien n'a été modifié. (E-01) » / « Compris » |
| Erreur E-02 | « Cette sauvegarde vient d'une version plus récente du jeu. Installez la dernière version puis réessayez. Rien n'a été modifié. (E-02) » |
| Erreur E-03 | « Espace de stockage insuffisant : la sauvegarde n'a pas été créée. Libérez de la place et réessayez. Votre progression est intacte. (E-03) » / « Réessayer » |
| Erreur E-04 | « La sauvegarde n'a pas pu être écrite à cet endroit. Votre progression est intacte. (E-04) » / « Réessayer » |
| Erreur E-08 (message passager, disparaît seul après 8 s, sans bouton) | « La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08) » |
| Aide du champ du nom | « Nom enregistré : <nom>. Touchez le champ pour en saisir un autre. » ; « Touchez « Valider » pour enregistrer ce nom. » |
| Erreur E-07 | « La restauration n'a pas pu être enregistrée. Votre progression n'a pas changé. (E-07) » / « Compris » |
| Erreur E-05 | « Votre progression n'a pas pu être lue. Vous pouvez restaurer une sauvegarde depuis le menu Sauvegarde. (E-05) » / « Compris » |
| Partie interrompue | « Votre dernière partie (<mode>, <score> points) a été interrompue ; elle a été enregistrée. », puis, s'il y a lieu, « Nouveau skin débloqué : <nom> » (une ligne par skin) et « Nouveau mode découvert : Constellation » / « Continuer » |
| Orientation | « Tournez votre téléphone à l'horizontale » |
| Installation | « Installer le jeu », « Jouez sans connexion, comme avec une application. », étapes du § 4.12, « Autre téléphone », « Jeu installé. Ouvrez-le depuis son icône sur l'écran d'accueil. », « Prêt à jouer hors ligne » (message passager au premier passage à l'état prêt) |
| Navigation | « ‹ Retour », « Compris », « Continuer » |

Règles de rédaction : toute erreur dit ce qui s'est passé, ce qui est intact et quoi faire, avec son code entre parenthèses ; aucun message n'affiche de trace technique ; aucun message n'accuse le joueur ; dates JJ/MM/AAAA, nombres avec espace pour les milliers (« 1 000 ») ; les noms de joueurs et de fichiers sont affichés comme texte brut. Les annulations de sélecteur de fichier ne produisent aucun message.

## 6. Accessibilité (RGAA 4.1, WCAG 2.2 niveau AA)
| Exigence | Application |
|---|---|
| Langue (3.3 WCAG 3.1.1) | `<html lang="fr">` ; tous les textes en français |
| Contrastes (1.4.3, 1.4.11) | texte : 4,5:1 au moins (valeurs § 7.1) ; boutons, bordures, symboles et éléments de jeu : 3:1 au moins sur chaque décor (calcul § 7.1) ; le test automatique de ENF-11 reprend la formule WCAG |
| Couleur non porteuse (1.4.1) | bonbons : couleur + silhouette (RG-12) ; état des interrupteurs : texte + position + coche ; skin choisi : texte + coche ; mode verrouillé : cadenas + texte ; erreur : icône « ! » + texte + code ; record : étoile + texte ; couleur attendue en Constellation : cadre épais + nom ; paires de trous noirs : halo de forme différente (anneau plein / anneau en pointillés) en plus de la teinte ; retour d'une flèche touchée : inversion + contour épais |
| Cibles tactiles (2.5.8) | 9 mm × 9 mm au moins (57 px), flèches 12 mm × 12 mm (76 px) ; espace de 8 px au moins entre deux cibles voisines |
| Texte (1.4.4, 1.4.12) | polices du système, corps 18 px (16 px au plus bas), majuscules d'au moins 1,8 mm sur le S22 (16 px × 0,18 mm × 0,7 = 2,0 mm) ; tailles en `rem` : l'agrandissement du texte demandé au système est respecté jusqu'à 200 % grâce au défilement vertical des écrans hors partie ; lignes de 70 caractères au plus |
| Clavier (2.1.1, 2.4.3, 2.4.7, 2.1.2) | tous les écrans hors partie se parcourent à la touche Tab, s'activent par Entrée ou Espace ; ordre = ordre de lecture ; Échap = « Retour », « Reprendre » ou « Non » ; aucun piège de focus (les boîtes de dialogue enferment le focus mais se ferment par Échap) ; focus visible : contour blanc de 3 px décalé de 2 px, jamais masqué (2.4.11) ; au retour d'un sous-écran, le focus revient au bouton qui l'a ouvert. L'aire de jeu elle-même n'est pas pilotée au clavier (hors périmètre de 02 § 6) ; les flèches sont néanmoins des boutons focalisables |
| Étiquettes et rôles (1.3.1, 4.1.2) | boutons natifs `button`, interrupteurs `role="switch"`, groupe radio pour la commande, onglets `role="tablist"`, boîtes `role="dialog"` avec titre ; champ du nom avec `label` visible « Votre nom » ; boutons à icône seule avec nom accessible (« Pause », « Mode précédent », « Haut ») ; le bouton verrouillé est `aria-disabled` et non retiré de l'ordre de lecture |
| Annonces (4.1.3) | zone vivante polie pour : messages passagers, état de la mise à jour, résultat de sauvegarde et de restauration, compte à rebours, « Pause », fin de partie (raison et score), effet de bonus ; l'aire de jeu (canevas) porte l'intitulé « Aire de jeu » et n'est pas décrite case par case |
| Mouvement et clignotement (2.3.1, 2.2.2, 2.3.3) | aucun élément ne clignote ou ne change de couleur plus de 3 fois par seconde (arc-en-ciel : au plus 3 changements par seconde par zone, RG-20) ; la pause arrête tout mouvement ; avec `prefers-reduced-motion`, l'arc-en-ciel devient un dégradé fixe, les transitions d'écran sont supprimées et le panneau de compte à rebours n'est pas animé |
| Alternative au geste (2.5.1, 2.5.7) | le glissement a pour équivalent les flèches (réglage « Flèches »), qui n'exigent aucun glissement (ENF-12) |
| Orientation (1.3.4) | paysage imposé : exception admise car essentielle au jeu (BES-01) ; le message E12 explique quoi faire |
| Sons et vibrations (1.2, 1.4.2) | aucune information n'est portée par le son ou la vibration seuls : chaque événement a un retour visuel ; musique coupable à tout moment depuis les réglages (volume non prévu, 02 § 6) |
| Délais (2.2.1) | aucun délai imposé aux menus ; messages passagers fermables et durables au moins 6 s, erreurs non temporaires |
| Saisie (3.3.1, 3.3.2) | le champ du nom accepte tout ; aucune erreur bloquante ; la limite de 12 caractères est annoncée |
| Écart assumé | l'aire de jeu ne peut être pilotée qu'au toucher ; ce n'est pas une barrière de lecture mais une limite de jouabilité, documentée dans le guide utilisateur |

## 7. Charte minimale
Réalisée en CSS pur dans `public/styles.css` et en constantes de couleur dans `core/rules.ts` pour le canevas ; aucune bibliothèque d'interface.

### 7.1 Couleurs et contrastes
Contrastes calculés selon la formule WCAG 2.2 (luminance relative, (L1 + 0,05) / (L2 + 0,05)).

| Rôle | Valeur | Luminance | Contraste mesuré |
|---|---|---|---|
| Fond d'écran (menus, décor « Nuit étoilée ») | `#0B1026` | 0,0058 | — |
| Surface (cartes, boîtes de dialogue) | `#1B2250` | 0,0196 | — |
| Texte principal | `#F5F7FF` | 0,931 | 17,6:1 sur le fond ; 14,1:1 sur la surface |
| Texte secondaire | `#B8C0E8` | 0,537 | 10,5:1 sur le fond ; 8,4:1 sur la surface |
| Bouton principal : fond | `#FFD84D` avec texte `#0B1026` | 0,709 | texte 13,6:1 ; fond du bouton contre l'écran 13,6:1 |
| Bouton secondaire : bordure 2 px | `#7C8AE6` sur surface | 0,282 | 5,9:1 sur le fond ; 4,8:1 sur la surface |
| Focus | contour `#FFFFFF` 3 px | 1,0 | 18,8:1 sur le fond |
| Erreur (texte, avec icône) | `#FFA3A3` | 0,501 | 9,9:1 sur le fond ; 7,9:1 sur la surface |
| Succès (texte, avec coche) | `#8EF0B0` | 0,712 | 10,9:1 sur la surface |

Décors (couleur de base ; les étoiles, nébuleuses et autres détails restent à une luminance de 0,08 au plus, pour ne jamais concurrencer les éléments de jeu) :

| Décor | Base | Luminance |
|---|---|---|
| Nuit étoilée | `#0B1026` | 0,0058 |
| Nébuleuse | `#1F1147` | 0,0115 |
| Planète bonbon | `#2B0F3A` | 0,0116 |
| Voie lactée | `#12203F` | 0,0152 |

Éléments de jeu, mesurés contre le décor le plus clair (Voie lactée, (L + 0,05) / 0,0652) ; l'exigence est 3:1 :

| Élément | Valeur | Luminance | Contraste |
|---|---|---|---|
| Bonbon et serpent rose | `#FF4FA3` | 0,295 | 5,3:1 |
| Bonbon et serpent violet | `#A66BFF` | 0,258 | 4,7:1 |
| Bonbon et serpent rose clair | `#FFC2E2` | 0,653 | 10,8:1 |
| Bonbon et serpent bleu clair | `#7FD8FF` | 0,608 | 10,1:1 |
| Arc-en-ciel (au moins 5 teintes) | `#FF6B6B`, `#FFB347`, `#FFE066`, `#5EE6A0`, `#7FD8FF`, `#A66BFF` | la plus sombre : 0,328 | 5,8:1 au pire |
| Astéroïde | `#9AA0B5`, cratères sombres | 0,354 | 6,2:1 |
| Halo de trou noir, paire 1 | `#FFB347` (anneau plein) | 0,540 | 9,0:1 |
| Halo de trou noir, paire 2 | `#4DE3C1` (anneau en pointillés) | 0,605 | 10,0:1 |
| Contour de tout élément de jeu | `#FFFFFF`, 1 px | 1,0 | 16:1 |

Distinction entre couleurs de bonbons : le rose et le violet ont des luminances voisines (contraste mutuel 1,1:1) ; elles se distinguent par la teinte et surtout par la silhouette (rond enveloppé, berlingot, guimauve, étoile en sucre, RG-12), conformément à ENF-11. Le test à 3 personnes en recette confirme.

### 7.2 Typographie
- Famille : `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (police du système, ADR-06).
- Échelle : titre du jeu 32 px gras ; titre d'écran 24 px gras ; score du bandeau 24 px gras, chiffres de largeur fixe ; corps 18 px ; secondaire 16 px (minimum) ; chiffre du compte à rebours 72 px gras.
- Interligne 1,4 ; pas de texte en majuscules continu ; pas de texte justifié. Ceci prévaut sur la maquette E1 du § 4.1 : le titre s'écrit « Serpent Cosmique » (écart accepté par la revue de LOT-02).

### 7.3 Espacements, formes, mouvement
- Échelle d'espacement : 4, 8, 12, 16, 24 px ; marge d'écran 8 px au moins en plus des zones sûres (`env(safe-area-inset-*)`).
- Boutons : 11 mm de haut (70 px) ; principal 16 mm ; coins arrondis de 12 px ; bordure de 2 px ; écart de 8 px au moins entre deux boutons.
- Pictogrammes dessinés par le code (SVG ou canevas), trait de 2 px, taille 24 px au moins.
- Transitions de 150 ms au plus ; aucune animation décorative en jeu hormis l'arc-en-ciel et le décor.
- Le jeu affiche les écrans hors partie et le bandeau d'information de la partie en DOM (`textContent`) ; seule l'aire de jeu est dessinée sur le canevas (texte éventuel en `fillText`), aux mêmes polices et contrastes. Le bandeau en DOM est un écart accepté par la revue de LOT-02.

### 7.4 Interface en ligne de commande
Sans objet : le jeu n'a pas de ligne de commande.

## 8. Hypothèses
| ID | Hypothèse | Origine | Conséquence si elle est fausse |
|---|---|---|---|
| HYP-33 | « À propos » n'offre pas de bouton « Rechercher une mise à jour » : la version disponible est signalée par la vérification faite à l'ouverture du jeu connecté (03 § 7.3, HYP-30) ; l'écran explique comment la provoquer (fermer puis rouvrir avec une connexion) | équipe projet | ajouter le bouton si l'architecte confirme qu'un appel de vérification à la demande reste compatible avec la politique CSP et ENF-09 |
| HYP-34 | Disposition des flèches : colonne gauche (Haut au-dessus de Bas), colonne droite (Gauche au-dessus de Droite), nom écrit sous chaque pictogramme, pour que les cases restent à 3,3 mm au moins sur iPhone SE | équipe projet | revoir en cas d'inconfort constaté au test de 3 personnes (côté ergonomie) ; une croix classique exigerait de réduire les cases à 2,6 mm environ, sous l'exigence de ENF-04 |
| HYP-35 | Le panneau « Installer le jeu » s'ouvre depuis un bandeau du menu, visible seulement hors de l'application installée, non bloquant et sans mémoire de refus | équipe projet | ajouter une ouverture automatique au premier lancement dans le navigateur |
| HYP-36 | Le champ du nom n'a pas de focus automatique (le record est déjà enregistré, RG-53) ; le défilement garde le champ visible au-dessus du clavier du téléphone | équipe projet | focus automatique si le test montre que les joueurs oublient de saisir leur nom |
| HYP-37 | Après une mise à jour réussie, le jeu se recharge puis affiche un message sur le menu ; l'implémentation retient pour cela un marqueur temporaire de la session (aucune donnée du joueur) | équipe projet | afficher seulement la nouvelle version dans « À propos » |

## 9. Points à vérifier en recette
- Mesure des cases (3,3 mm au moins sur iPhone SE en « Flèches », 4 mm au moins sur S22) et des cibles tactiles à la règle sur capture (ENF-04, ENF-12, R-13).
- Ergonomie de la disposition des flèches (HYP-34) avec 3 personnes ; clavier du téléphone en paysage sur l'écran de fin (HYP-36).
- Contrastes sur les captures des 4 décors, avec tous les détails de décor (ENF-11) ; identification des 4 bonbons à bout de bras.
- Écran « À propos » : scénarios CA-1 à CA-4 d'EF-29 (aucun affichage de la proposition pendant une partie, E-06 en coupant la connexion).

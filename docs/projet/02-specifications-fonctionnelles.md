# Spécifications fonctionnelles — Serpent Cosmique (jeu de serpent spatial)

| Version | Date | Source |
|---|---|---|
| 1.0 | 2026-11-01 | 01-expression-du-besoin.md v1.0 |
| 1.1 | 2026-11-02 | précisions issues du dossier d'architecture (03) et de l'analyse de risques (04, EXS-04) : RG-10, RG-64, RG-68, RG-72, RG-85, ENF-09, ENF-16 et dictionnaire modifiés ; RG-81 complétée ; EF-29 (RG-89, RG-90, RG-91, RG-92) ajoutée ; HYP-30 et HYP-31 reprises du dossier d'architecture, HYP-32 reprise de 01 |
| 1.2 | 2026-11-02 | compléments décidés par l'équipe projet et consignés dans 01 : RG-58, RG-73, RG-79 et ENF-16 modifiées (erreur E-07, annonce des déblocages d'une partie interrompue) ; EF-24 CA-5 et EF-27 CA-4 ajoutés ; HYP-43 et HYP-44 reprises de 01 |
| 1.3 | 2026-11-02 | compléments décidés par l'équipe projet : RG-45, RG-50, RG-53, ENF-16 et dictionnaire (date des records) modifiés ; RG-93 (erreur E-08), RG-94 (contrôle des dates), RG-95 (bouton retour) ajoutées ; EF-01 CA-4, EF-16 CA-4, EF-18 CA-5 et CA-6 ajoutés ; HYP-45, HYP-48 et HYP-49 reprises de 01, HYP-46 et HYP-47 ajoutées |
| 1.4 | 2026-11-07 | RG-69 et ENF-15 modifiées (remplacement d'un fichier de sauvegarde existant seulement sur choix et confirmation du joueur) ; EF-23 CA-4 ajouté ; HYP-50 reprise de 01 |
| 1.5 | 2026-11-07 | RG-79 et dictionnaire (Partie interrompue) modifiés : nombre de bonbons mangés par partie borné à 9 999 au lieu de 288 ; HYP-51 reprise de 01 |

Nom du jeu retenu par l'équipe projet : « Serpent Cosmique » (HYP-08). Les libellés entre guillemets sont les libellés de référence ; la conception UX peut en ajuster la forme sans en changer le sens.

## 1. Acteurs
| Acteur | Description | Besoins (BES) |
|---|---|---|
| Joueur | Toute personne qui joue sur le téléphone : le demandeur, un ami, ou plusieurs personnes à tour de rôle sur le même téléphone. Adulte, à l'aise avec un téléphone, téléphone tenu à l'horizontale, souvent sans réseau. Aucun compte : tous les joueurs d'un téléphone partagent skins, réglages et compteurs ; seuls les noms des records les distinguent. | BES-01, BES-02, BES-03, BES-04, BES-05, BES-06, BES-07, BES-08, BES-09, BES-10, BES-11, BES-12, BES-13, BES-14, BES-16 |
| Demandeur (joueur principal et mainteneur) | Joueur principal sur Samsung Galaxy S22 ; installe le jeu, installe les nouvelles versions, sauvegarde et transfère sa progression, transmet le jeu à un ou deux amis. | BES-15 et tous les besoins du Joueur |
| Ami du demandeur | Joueur sur son propre téléphone Android ou iPhone de moins de 5 ans ; installe le jeu seul en suivant le guide. | BES-01, BES-15 et tous les besoins du Joueur |
| Système du téléphone | Acteur secondaire : provoque des interruptions (appel, notification, verrouillage, changement d'application, fermeture du jeu, rotation) et fournit le choix de fichiers. | BES-15, BES-16 |

## 2. Vue d'ensemble
Parcours principal :
1. Le joueur ouvre le jeu : le menu principal s'affiche (Jouer, Records, Skins, Réglages, Sauvegarde).
2. Il touche « Jouer », puis un mode dans la liste ; chaque mode y est expliqué en deux phrases au plus.
3. Un compte à rebours de 3 secondes s'affiche avec un rappel du mode de commande ; le serpent rose démarre.
4. Il dirige le serpent (glissement ou flèches), mange des bonbons de quatre couleurs ; le serpent grandit, prend la couleur du dernier bonbon et devient arc-en-ciel à chaque dizaine.
5. La partie se termine par une collision, la fin du temps, une victoire (aire de jeu pleine) ou un abandon depuis l'écran de pause. Toute interruption du téléphone met la partie en pause.
6. L'écran de fin affiche la raison, le score, les skins ou le mode débloqués ; si le score entre dans les 10 meilleurs du mode, le joueur saisit son nom (le dernier nom saisi est proposé).
7. Il rejoue, ou revient au menu pour consulter les records, choisir des skins, modifier les réglages, créer ou restaurer une sauvegarde.

## 3. Exigences fonctionnelles
Règles : un identifiant par exigence, jamais de plage ; chaque EF cite ses besoins sources et a au moins deux critères d'acceptation observables, dont un cas d'erreur ou un cas limite.

Conventions communes à toutes les EF :
- **Grille** : 24 colonnes × 12 lignes de cases carrées ; colonne 1 à gauche, ligne 1 en haut. « Distance » entre deux cases = nombre de colonnes d'écart + nombre de lignes d'écart.
- **Pas** : déplacement du serpent d'une case. La vitesse s'exprime en cases par seconde (c/s) ; l'intervalle entre deux pas vaut 1 000 / vitesse millisecondes (6 c/s = 167 ms, 12 c/s = 83 ms).
- **Case libre** : case qui n'est occupée ni par le serpent (tête ou anneau), ni par un bonbon, ni par un astéroïde, ni par un trou noir.
- **Bonbons mangés** : nombre de bonbons (normaux et spéciaux) mangés depuis le début de la partie.
- **Tirage au hasard** : tirage équiprobable, reproductible pour la recette (ENF-19).

Synthèse des modes (détail dans les EF citées) :

| Mode | EF | Vitesse (c/s) | Bords de la grille | Propre corps | Bonbons présents | Obstacles | Score | Fin de partie |
|---|---|---|---|---|---|---|---|---|
| Classique | EF-09 | 6 + 0,2 par bonbon mangé, 12 au plus | mortels | mortel | 1 | aucun | 1 point par bonbon | collision, victoire, abandon |
| Contre la montre | EF-10 | 8, fixe | mortels | mortel | 3 | aucun | 1 point par bonbon | 60 s écoulées, collision, victoire, abandon |
| Champ d'astéroïdes | EF-11 | 7, fixe | mortels | mortel | 1 | 3 astéroïdes au départ, +1 tous les 5 bonbons, 30 au plus | 1 point par bonbon | collision, victoire, abandon |
| Trou noir | EF-12 | 6 + 0,2 par bonbon mangé, 12 au plus | mortels | mortel | 1 | 2 paires de trous noirs | 1 point par bonbon | collision, victoire, abandon |
| Bonus et pièges | EF-13 | 7 ; 4 sous Ralenti ; 11 sous Turbo | mortels | mortel | 1 + 1 bonbon spécial au plus | aucun | 1 point par bonbon | collision, victoire, abandon |
| Zen | EF-14 | 6, fixe | traversés | traversé | 1 | aucun | 1 point par bonbon | abandon, victoire |
| Constellation (mode surprise) | EF-15 | 7, fixe | mortels | mortel | 4 (un par couleur) | aucun | 1 point par bonbon de la bonne couleur, +5 par constellation | collision, victoire, abandon |

### EF-01 — Menu principal et lancement d'une partie
- **Source** : BES-01
- **Priorité** : Must
- **Description** : En tant que joueur, je veux lancer une partie en deux touchers depuis le menu afin de jouer tout de suite, sans explication.
- **Règles métier** :
  - RG-01 (source BES-01) : le menu principal propose « Jouer », « Records », « Skins », « Réglages » et « Sauvegarde ». Il s'affiche à chaque ouverture du jeu, sauf traitement préalable d'une partie interrompue (RG-79).
  - RG-02 (source BES-01, BES-10) : « Jouer » affiche la liste des modes dans cet ordre : Classique, Contre la montre, Champ d'astéroïdes, Trou noir, Bonus et pièges, Zen, puis l'emplacement du mode surprise (RG-40). Chaque mode affiche son nom et sa règle en deux phrases au plus (libellés de référence ci-dessous). Toucher un mode disponible lance la partie.
  - RG-03 (source BES-01) : libellés de référence des règles :
    - Classique : « Mangez les bonbons pour grandir. Le serpent accélère peu à peu : ne touchez ni les bords ni votre queue. »
    - Contre la montre : « Mangez un maximum de bonbons en 60 secondes. Attention aux bords et à votre queue ! »
    - Champ d'astéroïdes : « Un nouvel astéroïde apparaît tous les 5 bonbons. Évitez-les, ainsi que les bords et votre queue. »
    - Trou noir : « Entrez dans un trou noir pour ressortir par son jumeau. Ne touchez ni les bords ni votre queue. »
    - Bonus et pièges : « Des bonbons spéciaux ralentissent, accélèrent, rétrécissent le serpent ou inversent les commandes pendant quelques secondes. Ne touchez ni les bords ni votre queue. »
    - Zen : « Impossible de perdre : traversez les bords et votre propre corps. Quittez quand vous voulez avec le bouton pause. »
    - Constellation : « Mangez les bonbons dans l'ordre des couleurs indiqué pour tracer une constellation et gagner 5 points de bonus. Ne touchez ni les bords ni votre queue. »
- **Critères d'acceptation** :
  - CA-1 : Étant donné le jeu fermé, quand le joueur l'ouvre puis touche « Jouer » et « Classique », alors le compte à rebours de la partie Classique s'affiche, après exactement deux touchers depuis le menu principal.
  - CA-2 : Étant donné la liste des modes affichée, quand le joueur la lit, alors chacun des modes disponibles affiche une règle d'au plus deux phrases et 200 caractères.
  - CA-3 : Étant donné le mode surprise pas encore découvert, quand le joueur touche son emplacement, alors aucune partie ne démarre et le message de RG-40 s'affiche.
  - CA-4 (ajouté en v1.3) : Étant donné l'écran « Records » ouvert depuis le menu principal, quand le joueur appuie sur le bouton retour du téléphone, alors le menu principal s'affiche ; quand il appuie de nouveau sur le bouton retour, le jeu se ferme comme toute application, sans perte de progression (RG-95).

### EF-02 — Aire de jeu, déplacement, croissance et fin par collision ou victoire
- **Source** : BES-01
- **Priorité** : Must
- **Description** : En tant que joueur, je veux diriger un serpent qui avance sur un fond spatial, grandit en mangeant des bonbons et perd s'il se percute, afin de jouer à un vrai jeu de serpent.
- **Règles métier** :
  - RG-04 (source BES-01, HYP-09) : l'aire de jeu est la grille de 24 × 12 cases, identique sur tous les téléphones, dessinée sur le décor choisi (fond spatial étoilé par défaut). Pendant la partie, le score courant, les informations propres au mode (temps restant, effet en cours, constellation à tracer) et le bouton pause restent affichés en permanence, hors de la grille.
  - RG-05 (source BES-01, HYP-09) : au départ, la tête est en colonne 6, ligne 6, orientée vers la droite, suivie de 3 anneaux en colonnes 5, 4 et 3 de la ligne 6 (longueur de départ : 4 cases). Un compte à rebours « 3 », « 2 », « 1 » de 3 secondes, accompagné du rappel « Glissez le doigt pour diriger le serpent » ou « Utilisez les flèches pour diriger le serpent » selon le réglage, précède le premier pas.
  - RG-06 (source BES-01) : hors pause et compte à rebours, le serpent avance d'une case par pas, sans jamais s'arrêter, à la vitesse du mode ; un changement de vitesse s'applique dès le pas suivant.
  - RG-07 (source BES-01) : quand la tête entre dans une case contenant un bonbon, le bonbon est mangé : le serpent gagne un anneau (sa queue ne se déplace pas à ce pas, sauf effet Rétrécissement de RG-36), le score augmente selon le mode, et un nouveau bonbon est placé selon RG-15.
  - RG-08 (source BES-01, HYP-11) : dans tous les modes sauf Zen, la partie se termine par « Collision » si la tête sort de la grille, entre dans une case occupée par un anneau, ou touche un astéroïde. La case que la queue quitte au même pas compte comme libre, sauf si le serpent grandit à ce pas. Le serpent reste figé à l'endroit de la collision, puis l'écran de fin s'affiche 1 seconde (± 0,2 s) après.
  - RG-09 (source BES-01, cas d'erreur « aire de jeu pleine ») : quand un bonbon doit être placé et qu'il ne reste aucune case libre, la partie se termine par une « Victoire » ; le score est retenu comme pour toute fin de partie.
  - RG-10 (source BES-01, HYP-31) (modifiée en v1.1) : l'écran du téléphone ne se met pas en veille pendant une partie en cours (hors pause), même sans toucher l'écran. Exception admise : sur iPhone sous une version d'iOS antérieure à 18.4, l'écran peut se mettre en veille ; la partie passe alors en pause sans aucune perte (RG-77).
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Classique qui démarre, quand le compte à rebours se termine, alors le serpent rose de 4 cases, tête en colonne 6 ligne 6, avance vers la droite d'une case par pas.
  - CA-2 : Étant donné un serpent de 7 cases, quand il mange un bonbon, alors il mesure 8 cases au pas suivant et le score augmente de 1 en mode Classique.
  - CA-3 : Étant donné un serpent qui avance vers la droite en colonne 24, quand il fait le pas suivant, alors la partie se termine par « Collision » et l'écran de fin s'affiche environ 1 seconde après.
  - CA-4 : Étant donné un serpent dont la tête est juste derrière sa queue (serpent en boucle fermée), quand il avance sans manger dans la case que la queue quitte, alors la partie continue.
  - CA-5 : Étant donné une partie de recette où il ne reste qu'une case libre et un bonbon sur l'aire, quand le serpent mange ce bonbon et qu'aucune case libre ne reste pour le suivant, alors la partie se termine par « Victoire » et le score est affiché et retenu.
  - CA-6 : Étant donné une partie Zen en cours sans aucun toucher pendant 5 minutes, quand le délai de mise en veille du téléphone est de 30 secondes, alors l'écran reste allumé (sur le S22, sur Android et sur iPhone sous iOS 18.4 ou ultérieur) ; sur iPhone sous une version antérieure, s'il se met en veille, la partie est en pause au retour et rien n'est perdu.

### EF-03 — Apparition des bonbons
- **Source** : BES-01, BES-02
- **Priorité** : Must
- **Description** : En tant que joueur, je veux voir apparaître des bonbons de quatre couleurs bien reconnaissables afin de savoir quoi manger et quelle couleur prendra mon serpent.
- **Règles métier** :
  - RG-11 (source RM-01) : tout bonbon, normal ou spécial, a exactement une des quatre couleurs : rose, violet, rose clair, bleu clair. Aucune autre couleur de bonbon n'existe.
  - RG-12 (source RM-01, HYP-19) : chaque couleur a aussi une silhouette propre, pour rester distinguable : rose = bonbon rond enveloppé ; violet = berlingot (triangle) ; rose clair = guimauve (carré arrondi) ; bleu clair = étoile en sucre. Le dessin final peut évoluer tant que les quatre silhouettes restent différentes et que chaque couleur garde la sienne.
  - RG-13 (source RM-01) : sauf règle propre au mode (EF-15), la couleur d'un nouveau bonbon est tirée au hasard parmi les quatre.
  - RG-14 (source BES-01) : un bonbon ne se déplace pas et reste en place jusqu'à ce qu'il soit mangé (sauf durée de vie d'un bonbon spécial, RG-35).
  - RG-15 (source BES-01) : un nouveau bonbon est placé sur une case libre tirée au hasard ; il n'apparaît jamais sous le serpent, sur un autre bonbon, un astéroïde ou un trou noir. Le nombre de bonbons présents en même temps dépend du mode (tableau de synthèse).
- **Critères d'acceptation** :
  - CA-1 : Étant donné une série de recette de 400 bonbons apparus, quand on relève leurs couleurs, alors chacun est rose, violet, rose clair ou bleu clair, et chaque couleur apparaît entre 70 et 130 fois.
  - CA-2 : Étant donné un serpent de 200 cases, quand 100 bonbons successifs apparaissent, alors aucun n'apparaît sur une case du serpent, d'un autre bonbon ou d'un obstacle.
  - CA-3 : Étant donné les quatre bonbons affichés côte à côte sur chacun des décors, quand un joueur les observe à bout de bras, alors il nomme correctement la couleur de chacun.

### EF-04 — Couleur du serpent
- **Source** : BES-02
- **Priorité** : Must
- **Description** : En tant que joueur, je veux que mon serpent prenne la couleur du dernier bonbon mangé afin de profiter de l'univers coloré du jeu.
- **Règles métier** :
  - RG-16 (source RM-02) : au début de chaque partie, dans tous les modes et quel que soit le skin choisi, tout le serpent (tête et anneaux) est rose, quelle que soit la couleur de fin de la partie précédente.
  - RG-17 (source RM-03) : quand le serpent mange un bonbon, tout le serpent prend la couleur de ce bonbon dès ce pas et la garde jusqu'au bonbon suivant, y compris pendant une pause, un effet de bonus ou un passage par un trou noir.
  - RG-18 (source RM-07) : un skin ne change jamais la couleur du serpent : la forme et le motif sont dessinés dans la couleur courante du serpent (le motif n'utilise que des nuances de cette couleur ou du blanc), et la traînée prend la couleur courante du serpent.
- **Critères d'acceptation** :
  - CA-1 : Étant donné le déroulé de SCN-01, quand le serpent mange un bonbon violet puis un rose clair, alors il devient violet puis rose clair.
  - CA-2 : Étant donné un serpent bleu clair, quand il avance 20 secondes sans manger (mode Zen), alors il reste bleu clair et ne redevient jamais rose de lui-même.
  - CA-3 : Étant donné une partie terminée avec un serpent violet et la forme « Comète » choisie, quand le joueur lance une nouvelle partie, alors la comète est rose au départ, puis violette après un bonbon violet.

### EF-05 — Serpent arc-en-ciel à chaque dizaine
- **Source** : BES-02
- **Priorité** : Must
- **Description** : En tant que joueur, je veux voir mon serpent devenir arc-en-ciel à chaque dizaine de bonbons afin de fêter ma progression.
- **Règles métier** :
  - RG-19 (source RM-04, HYP-01) : quand le nombre de bonbons mangés devient un multiple de 10 (10e, 20e, 30e…), le serpent devient arc-en-ciel au lieu de prendre la couleur de ce bonbon ; il le reste jusqu'au bonbon suivant, qui lui donne sa couleur (RG-17). Tous les bonbons comptent, quel que soit leur type.
  - RG-20 (source RM-04) : l'arc-en-ciel est uniquement visuel : il ne change ni le score, ni la vitesse, ni les collisions, ni les effets. Il montre au moins 5 couleurs différentes le long du serpent ; s'il est animé, aucune zone ne change de couleur plus de 3 fois par seconde.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un serpent qui a mangé 9 bonbons, quand il mange le 10e, alors il devient arc-en-ciel ; quand il mange ensuite un 11e bonbon violet, alors il devient violet.
  - CA-2 : Étant donné un serpent arc-en-ciel au 10e bonbon en mode Classique, quand il touche un bord, alors la partie se termine par « Collision » avec un score de 10, sans point ni protection supplémentaire.
  - CA-3 : Étant donné un serpent qui a mangé 19 bonbons, quand il mange le 20e, alors il redevient arc-en-ciel.

### EF-06 — Commande par glissement
- **Source** : BES-03
- **Priorité** : Must
- **Description** : En tant que joueur, je veux diriger le serpent en glissant le doigt afin de jouer sans viser de bouton.
- **Règles métier** :
  - RG-21 (source BES-03) : quand le réglage de commande vaut « Glissement », un glissement d'au moins 5 mm n'importe où sur l'écran de jeu, sauf sur le bouton pause, donne une direction : celle de l'axe dominant (horizontal ou vertical). La commande est prise dès que le seuil de 5 mm est atteint, sans attendre que le doigt se lève ; un même contact ne donne qu'une commande.
  - RG-22 (source BES-03) : un toucher bref ou un glissement de moins de 5 mm ne donne aucune commande. Les flèches ne sont pas affichées.
- **Critères d'acceptation** :
  - CA-1 : Étant donné le réglage « Glissement » et un serpent qui va à droite, quand le joueur glisse vers le haut de 1 cm, alors le serpent monte au pas suivant.
  - CA-2 : Étant donné le réglage « Glissement », quand le joueur touche brièvement l'écran sans glisser, alors la direction du serpent ne change pas.
  - CA-3 : Étant donné un glissement en diagonale de 8 mm vers la droite et 4 mm vers le haut, quand il est reconnu, alors la commande est « droite ».

### EF-07 — Commande par flèches à l'écran
- **Source** : BES-03
- **Priorité** : Must
- **Description** : En tant que joueur, je veux diriger le serpent avec quatre flèches à l'écran afin de jouer avec des touchers précis.
- **Règles métier** :
  - RG-23 (source BES-03) : quand le réglage de commande vaut « Flèches », quatre flèches (haut, bas, gauche, droite) sont affichées hors de la grille, chacune d'au moins 12 mm × 12 mm. La commande est prise dès que le doigt touche la flèche, avec un retour visuel sur la flèche touchée.
  - RG-24 (source BES-03) : en mode « Flèches », les glissements ne donnent aucune commande.
- **Critères d'acceptation** :
  - CA-1 : Étant donné le réglage « Flèches » et un serpent qui va vers le haut, quand le joueur touche la flèche gauche, alors le serpent tourne à gauche au pas suivant et la flèche montre un retour visuel.
  - CA-2 : Étant donné le réglage « Flèches », quand le joueur glisse le doigt sur la grille, alors la direction du serpent ne change pas.
  - CA-3 : Étant donné le plus petit téléphone visé (ENF-04) avec le réglage « Flèches », quand la partie s'affiche, alors aucune flèche ne recouvre une case de la grille.

### EF-08 — Prise en compte des commandes
- **Source** : BES-03
- **Priorité** : Must
- **Description** : En tant que joueur, je veux que chaque commande soit prise dans l'ordre et qu'un demi-tour soit ignoré afin de ne jamais perdre à cause des commandes.
- **Règles métier** :
  - RG-25 (source BES-03, cas « deux glissements très rapides ») : les commandes reçues entre deux pas sont gardées dans l'ordre dans une file de 2 commandes au plus ; chaque pas en applique une, la plus ancienne. Une commande reçue quand la file est pleine est ignorée.
  - RG-26 (source BES-03, cas « demi-tour direct ») : une commande opposée à la direction de référence (la dernière commande de la file, ou à défaut la direction actuelle du serpent) est ignorée ; une commande identique à la direction de référence est ignorée aussi et n'occupe pas la file. Cette règle vaut dans tous les modes, Zen compris, et s'applique à la direction effective après une éventuelle inversion (RG-36).
  - RG-27 (source BES-03, BES-16) : une commande reçue pendant le compte à rebours de départ ou de reprise entre dans la file et s'applique au premier pas. À la mise en pause, la file est vidée ; pendant la pause, aucune commande n'est prise.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un serpent qui va à droite, quand le joueur glisse vers le haut puis vers la gauche avant le pas suivant, alors le serpent monte au pas suivant puis va à gauche au pas d'après.
  - CA-2 : Étant donné un serpent qui va à droite avec une file vide, quand le joueur demande « gauche », alors la commande est ignorée et le serpent continue à droite sans se mordre.
  - CA-3 : Étant donné une file contenant déjà 2 commandes, quand le joueur donne une troisième commande avant le pas suivant, alors cette troisième commande n'est pas appliquée.

### EF-09 — Mode Classique
- **Source** : BES-04
- **Priorité** : Must
- **Description** : En tant que joueur, je veux un mode où le serpent accélère peu à peu jusqu'à la collision afin de tester mes réflexes.
- **Règles métier** :
  - RG-28 (source BES-04, HYP-10) : vitesse = 6 + 0,2 × bonbons mangés, plafonnée à 12 c/s (plafond atteint au 30e bonbon). Un bonbon présent à la fois ; bords et corps mortels (RG-08) ; 1 point par bonbon.
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Classique, quand le serpent a mangé 0 puis 15 bonbons, alors l'intervalle entre deux pas vaut 167 ms (± 10 %) puis 111 ms (± 10 %).
  - CA-2 : Étant donné une partie Classique où le serpent a mangé 45 bonbons, quand on mesure l'intervalle entre deux pas, alors il vaut 83 ms (± 10 %) et ne descend jamais en dessous.
  - CA-3 : Étant donné une partie Classique avec 11 bonbons mangés, quand le serpent se mord la queue, alors la partie se termine par « Collision » avec 11 points.

### EF-10 — Mode Contre la montre
- **Source** : BES-05
- **Priorité** : Should
- **Description** : En tant que joueur, je veux manger le plus de bonbons possible en 60 secondes afin de battre mon record dans un temps fixe.
- **Règles métier** :
  - RG-29 (source BES-05, HYP-13) : le chrono de 60 secondes démarre au premier pas ; le temps restant est affiché en secondes entières, arrondi à l'unité supérieure. À 0, la partie se termine par « Temps écoulé ». Vitesse fixe 8 c/s ; 3 bonbons présents en permanence ; bords et corps mortels : une collision termine la partie avant la fin du temps ; 1 point par bonbon.
  - RG-30 (source BES-05, BES-16) : le chrono est figé pendant la pause et pendant le compte à rebours de reprise ; il reprend avec le temps restant, à 0,1 seconde près.
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Contre la montre sans collision, quand 60 secondes de jeu se sont écoulées, alors la partie se termine par « Temps écoulé » et affiche le nombre de bonbons mangés (par exemple 23).
  - CA-2 : Étant donné 35 secondes restantes, quand un appel arrive puis que le joueur reprend après 2 minutes, alors le chrono affiche 35 secondes à la reprise et la partie dure encore 35 secondes de jeu.
  - CA-3 : Étant donné une partie Contre la montre à 20 secondes restantes, quand le serpent touche un bord, alors la partie se termine par « Collision » avec le score atteint.
  - CA-4 : Étant donné une partie Contre la montre en cours, quand on compte les bonbons sur l'aire, alors il y en a toujours 3.

### EF-11 — Mode Champ d'astéroïdes
- **Source** : BES-06
- **Priorité** : Should
- **Description** : En tant que joueur, je veux éviter des astéroïdes de plus en plus nombreux afin d'avoir un défi qui monte en difficulté.
- **Règles métier** :
  - RG-31 (source BES-06, HYP-14) : 3 astéroïdes sont placés au départ ; un astéroïde de plus apparaît chaque fois que le nombre de bonbons mangés devient un multiple de 5, jusqu'à 30 astéroïdes au plus. Un astéroïde occupe une case et ne bouge jamais pendant la partie.
  - RG-32 (source BES-06) : un astéroïde est placé sur une case libre tirée au hasard, à une distance d'au moins 4 cases de la tête du serpent ; au départ, jamais sur la ligne 6. Toucher un astéroïde termine la partie par « Collision » (RG-08). Vitesse fixe 7 c/s ; un bonbon présent à la fois ; 1 point par bonbon.
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Champ d'astéroïdes, quand le serpent mange son 20e bonbon, alors 7 astéroïdes sont présents (3 de départ et 4 apparus).
  - CA-2 : Étant donné une partie de recette de 200 apparitions d'astéroïdes, quand chacun apparaît, alors aucun n'est à moins de 4 cases de la tête ni sur un bonbon ou le serpent.
  - CA-3 : Étant donné un astéroïde juste devant la tête, quand le serpent avance, alors la partie se termine par « Collision ».
  - CA-4 : Étant donné 30 astéroïdes présents, quand le serpent mange un 5e bonbon de plus, alors aucun nouvel astéroïde n'apparaît.

### EF-12 — Mode Trou noir
- **Source** : BES-07
- **Priorité** : Should
- **Description** : En tant que joueur, je veux traverser des trous noirs qui me téléportent d'un point à un autre afin de jouer avec l'espace.
- **Règles métier** :
  - RG-33 (source BES-07, HYP-15) : 2 paires de trous noirs (4 trous) sont placées au hasard au départ et ne bougent pas pendant la partie. Chaque trou occupe une case des colonnes 3 à 22 et des lignes 3 à 10, hors ligne 6 ; deux trous sont toujours à au moins 4 cases l'un de l'autre. Les deux trous d'une même paire ont le même halo ; les deux paires ont des halos différents, d'une teinte distincte des quatre couleurs de bonbons.
  - RG-34 (source BES-07) : quand la tête doit entrer dans un trou noir, elle ressort au même pas sur la case voisine du trou jumeau, dans la même direction ; les anneaux suivent le même chemin. Le serpent n'occupe jamais une case de trou noir. Si la case de sortie contient un bonbon, il est mangé ; si elle contient un anneau, la partie se termine par « Collision ». Vitesse : celle du mode Classique (RG-28) ; bords et corps mortels ; un bonbon à la fois ; 1 point par bonbon.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un trou noir en colonne 5 ligne 4 jumelé à un trou en colonne 18 ligne 9, quand le serpent qui va à droite entre dans le premier, alors sa tête apparaît en colonne 19 ligne 9 et continue vers la droite, ses anneaux suivant le même chemin.
  - CA-2 : Étant donné un anneau du serpent sur la case de sortie d'un trou jumeau, quand la tête entre dans le trou, alors la partie se termine par « Collision ».
  - CA-3 : Étant donné une partie de recette de 200 bonbons, quand chacun apparaît, alors aucun n'est placé sur un trou noir.

### EF-13 — Mode Bonus et pièges
- **Source** : BES-08
- **Priorité** : Should
- **Description** : En tant que joueur, je veux des bonbons spéciaux qui ralentissent, accélèrent, rétrécissent le serpent ou inversent les commandes afin de varier le jeu.
- **Règles métier** :
  - RG-35 (source BES-08, HYP-16) : chaque fois que le nombre de bonbons mangés devient un multiple de 3, un bonbon spécial apparaît sur une case libre, en plus du bonbon normal, s'il n'y en a pas déjà un. Son type est tiré au hasard parmi Ralenti, Turbo, Rétrécissement et Inversion ; sa couleur est tirée parmi les quatre couleurs (RG-11) et un pictogramme blanc indique son type. Non mangé après 8 secondes de jeu (pause exclue), il disparaît.
  - RG-36 (source BES-08, HYP-16) : effets d'un bonbon spécial mangé :
    - Ralenti : vitesse 4 c/s pendant 6 secondes ;
    - Turbo : vitesse 11 c/s pendant 6 secondes ;
    - Inversion : pendant 6 secondes, une commande « gauche » donne « droite », « droite » donne « gauche », « haut » donne « bas », « bas » donne « haut » ;
    - Rétrécissement : immédiat ; le serpent ne grandit pas et perd 3 anneaux depuis la queue, sans descendre sous 3 anneaux (longueur 4 cases).
    Hors effet, la vitesse est 7 c/s.
  - RG-37 (source BES-08, cas « deux effets se cumulent ») : un nouvel effet à durée (Ralenti, Turbo, Inversion) remplace l'effet à durée en cours et dure 6 secondes entières ; le Rétrécissement ne modifie pas l'effet à durée en cours. Un indicateur affiche le pictogramme, le nom de l'effet en cours et les secondes restantes (entières, arrondies à l'unité supérieure), et disparaît à la fin de l'effet. Les durées sont figées pendant la pause.
  - RG-38 (source BES-08, RM-03, RM-04) : un bonbon spécial vaut 1 point, compte pour l'arc-en-ciel et donne sa couleur au serpent comme un bonbon normal.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un bonbon « Inversion » mangé, quand le joueur glisse vers la gauche dans les 6 secondes, alors le serpent va à droite et l'indicateur affiche « Inversion » avec les secondes restantes ; après 6 secondes, glisser vers la gauche fait aller à gauche et l'indicateur a disparu.
  - CA-2 : Étant donné l'effet Ralenti en cours depuis 2 secondes, quand le serpent mange un bonbon « Turbo », alors la vitesse passe à 11 c/s, l'indicateur affiche « Turbo » et 6 secondes.
  - CA-3 : Étant donné un serpent de 5 cases, quand il mange un bonbon « Rétrécissement », alors il mesure 4 cases et le score augmente de 1.
  - CA-4 : Étant donné un bonbon spécial apparu, quand 8 secondes de jeu passent sans qu'il soit mangé, alors il disparaît ; une pause de 1 minute pendant ce délai ne le fait pas disparaître plus tôt.

### EF-14 — Mode Zen
- **Source** : BES-09
- **Priorité** : Should
- **Description** : En tant que joueur, je veux un mode où je ne perds jamais afin de me détendre.
- **Règles métier** :
  - RG-39 (source BES-09, HYP-11) : en mode Zen, aucune collision ne termine la partie : la tête qui sort par un bord réapparaît sur le bord opposé, même ligne ou même colonne ; le serpent traverse son propre corps. Vitesse fixe 6 c/s ; un bonbon à la fois ; 1 point par bonbon. La partie se termine seulement par un abandon (depuis l'écran de pause) ou une victoire (RG-09) ; son score suit les règles du tableau des records du mode Zen. Le demi-tour reste ignoré (RG-26).
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Zen, quand la tête entre dans une case de son propre corps, alors la partie continue sans fin de partie.
  - CA-2 : Étant donné une partie Zen et la tête en colonne 24 ligne 3 allant vers la droite, quand le serpent fait le pas suivant, alors la tête apparaît en colonne 1 ligne 3.
  - CA-3 : Étant donné une partie Zen à 25 points, quand le joueur abandonne depuis l'écran de pause, alors la partie se termine par « Abandon », le score de 25 est proposé au tableau Zen et n'apparaît pas dans le tableau Classique.

### EF-15 — Mode surprise « Constellation »
- **Source** : BES-10
- **Priorité** : Could
- **Description** : En tant que joueur, je veux découvrir un 7e mode original, dans le thème espace et bonbons, afin d'être surpris après mes premières parties.
- **Règles métier** :
  - RG-40 (source BES-10, HYP-17) : tant que moins de 3 parties ont été terminées sur le téléphone (tous modes et toutes fins confondus, compteurs de RG-45), la liste des modes affiche en 7e position « Mode mystère » verrouillé avec « Jouez encore N parties pour le découvrir » (N = parties restantes). À la fin de la 3e partie, l'écran de fin annonce « Nouveau mode découvert : Constellation » et le mode est disponible définitivement.
  - RG-41 (source BES-10, RM-01, HYP-17) : 4 bonbons sont présents en permanence, un de chaque couleur ; un bonbon mangé est remplacé par un bonbon de la même couleur sur une case libre. Un bandeau affiche la constellation à tracer : une suite de 3 couleurs différentes tirée au hasard, la couleur attendue étant mise en évidence (couleur et silhouette, RG-12).
  - RG-42 (source BES-10) : manger un bonbon de la couleur attendue rapporte 1 point et passe à la couleur suivante ; après la 3e couleur, la constellation est complétée : +5 points, une constellation s'ajoute au ciel du décor (effet seulement visuel) et une nouvelle suite de 3 couleurs est tirée. Manger un bonbon d'une autre couleur rapporte 0 point et ramène la progression à la première couleur de la même suite ; le serpent grandit et prend la couleur du bonbon dans tous les cas (RG-17).
  - RG-43 (source BES-10, RM-04) : l'arc-en-ciel compte les bonbons mangés, pas les points. Vitesse fixe 7 c/s ; bords et corps mortels.
- **Critères d'acceptation** :
  - CA-1 : Étant donné 2 parties terminées sur le téléphone, quand une 3e partie se termine, alors l'écran de fin annonce « Nouveau mode découvert : Constellation » et le mode apparaît en 7e position de la liste.
  - CA-2 : Étant donné la suite « rose, violet, bleu clair », quand le serpent mange dans l'ordre un bonbon rose, un violet et un bleu clair, alors le score vaut 8 et une nouvelle suite s'affiche.
  - CA-3 : Étant donné la suite « rose, violet, bleu clair » avec le rose déjà mangé, quand le serpent mange un bonbon rose clair, alors le score n'augmente pas, la couleur attendue redevient rose, le serpent devient rose clair et grandit d'un anneau.
  - CA-4 : Étant donné une partie Constellation en cours, quand on compte les bonbons sur l'aire, alors il y en a 4, un de chaque couleur.

### EF-16 — Fin de partie et écran de résultat
- **Source** : BES-01, BES-11, BES-12, BES-13
- **Priorité** : Must
- **Description** : En tant que joueur, je veux voir comment et avec quel score ma partie s'est terminée afin de savoir si j'ai battu un record et ce que j'ai débloqué.
- **Règles métier** :
  - RG-44 (source BES-01, BES-12) : l'écran de fin affiche le mode, la raison (« Collision », « Temps écoulé », « Victoire ! L'aire de jeu est pleine. », « Partie abandonnée »), le score, « Nouveau record ! » si le score entre au tableau (RG-48), puis les déblocages (skins, mode surprise), et deux boutons : « Rejouer » (même mode) et « Menu ».
  - RG-45 (source BES-11, données « compteurs de progression ») : à toute fin de partie, quelle qu'en soit la raison, le total de bonbons mangés augmente des bonbons mangés pendant la partie et le nombre de parties jouées du mode augmente de 1. Les compteurs, le record éventuel et les déblocages sont enregistrés durablement avant l'affichage de l'écran de fin (RG-83) ; si cet enregistrement échoue, l'écran de fin s'affiche quand même et RG-93 s'applique (précision ajoutée en v1.3).
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Classique de 11 points terminée par une collision, quand l'écran de fin s'affiche, alors il montre « Classique », « Collision », « 11 » et les boutons « Rejouer » et « Menu ».
  - CA-2 : Étant donné l'écran de fin d'une partie terminée avec un serpent violet, quand le joueur touche « Rejouer », alors une nouvelle partie du même mode démarre avec un serpent rose de 4 cases et un score de 0.
  - CA-3 : Étant donné un total de 40 bonbons et une partie abandonnée à 7 bonbons, quand l'écran de fin s'affiche puis que le jeu est fermé de force, alors à la réouverture le total vaut 47.
  - CA-4 (ajouté en v1.3) : Étant donné un téléphone dont le stockage refuse l'enregistrement de la progression (espace plein, ou échec simulé en recette), quand une partie se termine, alors l'écran de fin s'affiche normalement avec un message non bloquant E-08 (RG-93) ; quand le joueur libère de l'espace et termine une autre partie, aucun message n'apparaît et, après fermeture et réouverture du jeu, les compteurs comprennent les deux parties.

### EF-17 — Tableau des records par mode
- **Source** : BES-12
- **Priorité** : Must
- **Description** : En tant que joueur, je veux consulter les 10 meilleurs scores de chaque mode afin de me comparer aux autres joueurs du téléphone.
- **Règles métier** :
  - RG-46 (source RM-06) : chaque mode a son propre tableau de 10 records au plus. Un score n'entre que dans le tableau du mode joué.
  - RG-47 (source BES-12) : le tableau est trié par score décroissant ; à score égal, le record le plus ancien est placé avant.
  - RG-48 (source BES-12, cas « score égal au 10e », HYP-12) : un score entre au tableau s'il vaut au moins 1 et si le tableau a moins de 10 records ou si le score est strictement supérieur au 10e score ; le record qui passe alors en 11e position sort du tableau. Un score égal au 10e n'entre pas.
  - RG-49 (source BES-12, cycle de vie des records) : « Records » permet de choisir un des modes disponibles et affiche pour chaque record son rang, son nom, son score et sa date (JJ/MM/AAAA). Un tableau vide affiche « Aucun record pour l'instant ». Un record n'est jamais modifié ni supprimé par le jeu, sauf sa sortie du tableau (RG-48) et la mise à jour du nom pendant la saisie (RG-53).
- **Critères d'acceptation** :
  - CA-1 : Étant donné le déroulé de SCN-01, quand le joueur ouvre le tableau Classique, alors il affiche en tête « Coco — 11 — 01/11/2026 ».
  - CA-2 : Étant donné un mode jamais joué, quand le joueur ouvre son tableau, alors il affiche « Aucun record pour l'instant ».
  - CA-3 : Étant donné un tableau plein dont le 10e score vaut 15, quand une partie se termine avec 15 points, alors le tableau ne change pas et aucun nom n'est demandé ; avec 16 points, le score entre et l'ancien 10e sort.
  - CA-4 : Étant donné une partie terminée avec 0 point, quand l'écran de fin s'affiche, alors aucun record n'est créé, même si le tableau est vide.

### EF-18 — Saisie du nom d'un record
- **Source** : BES-13
- **Priorité** : Must
- **Description** : En tant que joueur, je veux saisir mon nom quand j'entre au tableau, le dernier nom étant proposé, afin d'être reconnu sans tout retaper.
- **Règles métier** :
  - RG-50 (source BES-13, HYP-47) (modifiée en v1.3 : source HYP-47 ajoutée) : quand le score entre au tableau, l'écran de fin affiche un champ « Votre nom » prérempli avec le dernier nom enregistré, c'est-à-dire le nom finalement enregistré au record précédent (vide au tout premier record du téléphone), et un bouton « Valider ».
  - RG-51 (source BES-13, cas « nom vide, trop long, caractères spéciaux », HYP-20) : les espaces de début et de fin, les retours à la ligne et les caractères de contrôle sont retirés ; un nom vide devient « Joueur » ; le nom compte 12 caractères au plus, un emoji ou une lettre accentuée comptant pour un caractère, et la saisie d'un 13e caractère est refusée. Lettres accentuées, chiffres, ponctuation et emojis sont acceptés.
  - RG-52 (source BES-13) : le nom est toujours affiché tel quel, comme du texte, sur tous les écrans ; il n'est jamais interprété.
  - RG-53 (source BES-13, BES-01, HYP-46, HYP-47) (modifiée en v1.3) : le record est enregistré dès la fin de partie avec le nom prérempli (ou « Joueur » s'il est vide) ; seule la validation remplace ce nom par le nom saisi. Quitter l'écran de saisie de toute autre façon (retour, « Menu », « Rejouer », fermeture du jeu) garde le nom prérempli déjà enregistré ; un texte tapé mais non validé n'est pas retenu. Le nom finalement enregistré au record (y compris « Joueur ») devient le dernier nom proposé.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un précédent record au nom de « Coco », quand une nouvelle partie entre au tableau, alors le champ propose « Coco » ; le joueur peut valider tel quel ou taper « Léa ».
  - CA-2 : Étant donné le champ du nom, quand le joueur efface tout et valide, alors le record s'affiche au nom de « Joueur ».
  - CA-3 : Étant donné le champ du nom, quand le joueur saisit « <script>Coco », alors le tableau affiche exactement ces 12 caractères comme du texte, et un 13e caractère est refusé.
  - CA-4 : Étant donné l'écran de saisie affiché, quand le jeu est fermé de force, alors à la réouverture le record figure au tableau avec le nom prérempli.
  - CA-5 (ajouté en v1.3) : Étant donné le champ prérempli avec « Coco », quand le joueur tape « Léa » puis appuie sur le bouton retour du téléphone sans toucher « Valider », alors le record figure au nom de « Coco » et le prochain record propose « Coco ».
  - CA-6 (ajouté en v1.3) : Étant donné le tout premier record du téléphone, quand l'écran de saisie s'affiche, alors le champ est vide ; si le joueur valide le champ vide, le record est au nom de « Joueur » et le record suivant propose « Joueur ».

### EF-19 — Catalogue et déblocage des skins
- **Source** : BES-11
- **Priorité** : Should
- **Description** : En tant que joueur, je veux débloquer des skins en jouant afin d'avoir des objectifs et de personnaliser mon serpent.
- **Règles métier** :
  - RG-54 (source BES-11, HYP-18) : le catalogue compte 16 skins, 4 par catégorie ; les 4 skins par défaut sont débloqués dès le premier lancement.

    | Identifiant | Catégorie | Nom | Condition de déblocage |
    |---|---|---|---|
    | shape-rings | Forme | Anneaux | débloqué d'office (défaut) |
    | shape-comet | Forme | Comète | atteindre 15 points dans une partie Classique |
    | shape-rocket | Forme | Fusée | 250 bonbons mangés au total |
    | shape-saucer | Forme | Soucoupe | 1 000 bonbons mangés au total |
    | pattern-plain | Motif | Uni | débloqué d'office (défaut) |
    | pattern-dots | Motif | Pois de sucre | 25 bonbons mangés au total |
    | pattern-stars | Motif | Étoiles | atteindre 20 points dans une partie Contre la montre |
    | pattern-candy-cane | Motif | Sucre d'orge | atteindre 20 points dans une partie Bonus et pièges |
    | trail-none | Traînée | Aucune | débloqué d'office (défaut) |
    | trail-stardust | Traînée | Poussière d'étoiles | 100 bonbons mangés au total |
    | trail-sugar | Traînée | Sillage de sucre | atteindre 15 points dans une partie Champ d'astéroïdes |
    | trail-aurora | Traînée | Aurore | atteindre 50 points dans une partie Zen |
    | decor-starry-night | Décor | Nuit étoilée | débloqué d'office (défaut) |
    | decor-nebula | Décor | Nébuleuse | atteindre 15 points dans une partie Trou noir |
    | decor-candy-planet | Décor | Planète bonbon | atteindre 25 points dans une partie Constellation |
    | decor-milky-way | Décor | Voie lactée | avoir terminé au moins une partie dans chacun des 7 modes |

  - RG-55 (source RM-05) : skins débloqués et skins choisis sont communs à tous les joueurs du téléphone.
  - RG-56 (source BES-11) : les conditions sont vérifiées à chaque fin de partie, sur le score de la partie et les compteurs mis à jour (RG-45), et après chaque restauration, sur les compteurs fusionnés (RG-70). Les compteurs comprennent les parties abandonnées ou interrompues.
  - RG-57 (source RM-08) : un skin débloqué le reste définitivement ; aucune action du jeu, restauration comprise, ne le reverrouille.
  - RG-58 (source BES-11, SCN-03, HYP-44) (modifiée en v1.2) : chaque skin débloqué à la fin d'une partie est annoncé sur l'écran de fin : « Nouveau skin débloqué : <nom> ». Un skin débloqué par une partie interrompue, clôturée au lancement suivant (RG-79), est annoncé de la même façon à ce lancement.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un total de 99 bonbons mangés, quand une partie se termine après au moins 1 bonbon mangé, alors l'écran de fin annonce « Nouveau skin débloqué : Poussière d'étoiles » et ce skin peut être choisi.
  - CA-2 : Étant donné un premier lancement, quand le joueur ouvre « Skins », alors seuls Anneaux, Uni, Aucune et Nuit étoilée sont débloqués et sélectionnés.
  - CA-3 : Étant donné la traînée « Poussière d'étoiles » débloquée, quand le joueur restaure une sauvegarde qui ne la contient pas, alors elle reste débloquée.
  - CA-4 : Étant donné une partie Classique abandonnée à 15 points, quand l'écran de fin s'affiche, alors la forme « Comète » est débloquée.

### EF-20 — Choix des skins
- **Source** : BES-11
- **Priorité** : Should
- **Description** : En tant que joueur, je veux voir les skins débloqués et verrouillés et choisir ceux à utiliser afin de personnaliser mes parties.
- **Règles métier** :
  - RG-59 (source BES-11, SCN-03, HYP-26) : l'écran « Skins », accessible depuis le menu principal, présente les 4 catégories ; chaque skin montre son nom, un aperçu et son état. Un skin verrouillé affiche sa condition et la progression chiffrée (par exemple « 63 / 100 bonbons » ou « meilleur score : 9 / 15 »).
  - RG-60 (source BES-11, cycle de vie des skins) : un skin est choisi par catégorie ; seuls les skins débloqués peuvent l'être. « Retirer » rend le skin par défaut de la catégorie. Le choix est enregistré aussitôt (RG-83) et s'applique à partir de la partie suivante.
  - RG-61 (source RM-07, attentes de lisibilité) : un skin ne cache jamais un élément de jeu : la traînée est dessinée sous les bonbons, les obstacles et le serpent, et chaque décor respecte les contrastes de ENF-11.
- **Critères d'acceptation** :
  - CA-1 : Étant donné la forme « Comète » débloquée, quand le joueur la choisit puis lance une partie, alors le serpent a la forme comète et il est rose au départ.
  - CA-2 : Étant donné la forme « Fusée » verrouillée et un total de 63 bonbons, quand le joueur la touche, alors elle n'est pas choisie et l'écran affiche « 250 bonbons mangés au total » et « 63 / 250 bonbons ».
  - CA-3 : Étant donné la traînée « Poussière d'étoiles » choisie, quand le joueur touche « Retirer », alors la traînée « Aucune » est choisie pour la partie suivante.

### EF-21 — Réglages
- **Source** : BES-14, BES-03
- **Priorité** : Must
- **Description** : En tant que joueur, je veux choisir mon mode de commande et activer ou couper séparément bruitages, musique et vibrations afin d'adapter le jeu au lieu où je joue.
- **Règles métier** :
  - RG-62 (source BES-14, BES-03, HYP-06) : les réglages sont : commande (« Glissement » ou « Flèches », défaut « Glissement ») ; bruitages, musique, vibrations (activé ou coupé, chacun activé par défaut). Ils sont communs au téléphone (RM-05), enregistrés aussitôt (RG-83), conservés entre les lancements et appliqués immédiatement (la musique s'arrête dès qu'elle est coupée) ; la commande s'applique à la partie suivante.
  - RG-63 (source BES-14, HYP-31) : si le téléphone ne permet pas au jeu de vibrer (cas attendu sur iPhone), le réglage des vibrations est affiché grisé avec « Non disponible sur ce téléphone ».
  - RG-64 (source maintenance, 01 § 6) (modifiée en v1.1) : la rubrique « À propos » des réglages affiche le nom du jeu, son numéro de version, « © CocoClaudo », l'état « Prêt à jouer hors ligne » dès que le jeu peut fonctionner sans réseau, et la proposition de mise à jour d'EF-29.
  - RG-65 (source HYP-26) : les réglages se modifient depuis le menu principal ; l'écran de pause ne les propose pas.
- **Critères d'acceptation** :
  - CA-1 : Étant donné le déroulé de SCN-02, quand le joueur choisit « Flèches », coupe la musique, relance une partie, puis ferme et rouvre le jeu, alors les flèches s'affichent, aucune musique ne joue, bruitages et vibrations restent actifs, et les réglages sont conservés.
  - CA-2 : Étant donné un premier lancement, quand le joueur ouvre les réglages, alors la commande vaut « Glissement » et bruitages, musique et vibrations sont activés.
  - CA-3 : Étant donné un téléphone qui ne permet pas la vibration au jeu, quand le joueur ouvre les réglages, alors le réglage des vibrations est grisé avec « Non disponible sur ce téléphone » et le jeu ne présente aucune erreur.

### EF-22 — Bruitages, musique et vibrations
- **Source** : BES-14
- **Priorité** : Must
- **Description** : En tant que joueur, je veux des sons et des vibrations qui accompagnent le jeu et respectent mes réglages afin de jouer partout.
- **Règles métier** :
  - RG-66 (source BES-14, HYP-28) : bruitages : bonbon mangé, bonbon spécial mangé, constellation complétée, fin de partie, nouveau record, déblocage. Musique : une musique de fond en boucle dans les menus et pendant les parties, arrêtée pendant la pause et dès que le jeu n'est plus au premier plan. Vibrations : 300 ms à une fin de partie par « Collision », 80 ms quand un bonbon spécial est mangé.
  - RG-67 (source BES-14) : chaque catégorie ne dépend que de son propre réglage. Aucun son ni vibration n'est émis quand le jeu n'est pas au premier plan.
- **Critères d'acceptation** :
  - CA-1 : Étant donné musique coupée et bruitages activés, quand le serpent mange un bonbon, alors le bruitage est joué et aucune musique n'est audible.
  - CA-2 : Étant donné vibrations coupées, quand une partie se termine par « Collision », alors le téléphone ne vibre pas ; avec vibrations activées, il vibre environ 300 ms.
  - CA-3 : Étant donné la musique activée et un menu affiché, quand le joueur passe à une autre application, alors la musique s'arrête aussitôt et ne reprend qu'au retour dans le jeu.

### EF-23 — Créer une sauvegarde
- **Source** : BES-15
- **Priorité** : Must
- **Description** : En tant que demandeur, je veux enregistrer toute ma progression dans un fichier afin de la garder et de la transférer sur un autre téléphone.
- **Règles métier** :
  - RG-68 (source BES-15) (modifiée en v1.1) : « Sauvegarde » > « Créer une sauvegarde » écrit un fichier unique contenant : l'identifiant du jeu, la version du format, la date et l'heure de création, les records des 7 modes, le dernier nom, les skins débloqués et choisis, les compteurs et les réglages, ainsi qu'un contrôle d'intégrité permettant de détecter toute altération. Le fichier est nommé « serpent-cosmique-sauvegarde-AAAA-MM-JJ-HHMM » (suivi de « -N » si le jeu a déjà produit ce nom depuis son ouverture, N étant le plus petit entier à partir de 2 qui donne un nom nouveau ; si un fichier de même nom existe déjà à l'emplacement d'enregistrement, c'est le téléphone qui ajoute son propre suffixe, sans jamais écraser le fichier existant) et placé à un emplacement accessible au gestionnaire de fichiers du téléphone, d'où le joueur peut le partager (dossier Téléchargements sur Android, application Fichiers sur iPhone), ou à l'emplacement choisi par le joueur si le téléphone le propose. Succès : « Sauvegarde créée : <nom du fichier> ».
  - RG-69 (source BES-15, cas « espace insuffisant », HYP-50) (modifiée en v1.4) : si l'écriture échoue (espace insuffisant, accès refusé, choix annulé), le message « Espace de stockage insuffisant : la sauvegarde n'a pas été créée. Libérez de la place et réessayez. Votre progression est intacte. (E-03) » ou « La sauvegarde n'a pas pu être écrite à cet endroit. Votre progression est intacte. (E-04) » s'affiche (aucun message si le joueur a annulé) ; aucune donnée du jeu n'est modifiée. Le jeu ne supprime jamais un fichier de sauvegarde et ne remplace jamais de lui-même un fichier existant. Seule exception : si le joueur choisit lui-même, dans la fenêtre d'enregistrement du téléphone, un fichier existant à remplacer et confirme ce remplacement, le jeu y écrit la nouvelle sauvegarde. Si le joueur ne confirme pas, rien n'est écrit et aucun message n'apparaît.
- **Critères d'acceptation** :
  - CA-1 : Étant donné un S22 avec des records et des skins, quand le demandeur crée une sauvegarde, alors le message donne le nom du fichier et ce fichier est visible dans le gestionnaire de fichiers, prêt à être partagé.
  - CA-2 : Étant donné un téléphone sans espace libre, quand le joueur crée une sauvegarde, alors le message E-03 s'affiche et records, skins et réglages sont inchangés.
  - CA-3 : Étant donné une sauvegarde déjà créée dans la même minute, sans fermer le jeu, quand le joueur en crée une seconde, alors elle porte le suffixe « -2 » et la première est intacte.
  - CA-4 (ajouté en v1.4) : Étant donné un téléphone dont la fenêtre d'enregistrement permet de choisir l'emplacement et un fichier de sauvegarde existant à cet emplacement, quand le joueur choisit ce fichier puis confirme « Remplacer » dans la fenêtre du téléphone, alors le fichier contient la nouvelle sauvegarde et peut être restauré ; s'il refuse le remplacement, le fichier existant est intact et aucune sauvegarde n'est écrite.

### EF-24 — Restaurer une sauvegarde
- **Source** : BES-15
- **Priorité** : Must
- **Description** : En tant que demandeur, je veux restaurer un fichier de sauvegarde sur ce téléphone ou un autre afin de retrouver mes records, skins et réglages.
- **Règles métier** :
  - RG-70 (source BES-15, RM-08, HYP-02, HYP-21) : fusion après confirmation :
    - records : réunion, par mode, des records du téléphone et du fichier ; un record identique (même nom, score, date et heure) n'est compté qu'une fois ; les 10 meilleurs sont gardés selon RG-47 ;
    - skins débloqués : réunion des deux ensembles ;
    - skins choisis, réglages et dernier nom : ceux du fichier ;
    - compteurs : pour chaque compteur, la plus grande des deux valeurs (ce qui rend la découverte du mode surprise définitive) ;
    puis vérification des conditions de déblocage (RG-56).
  - RG-71 (source BES-15) : parcours : « Sauvegarde » > « Restaurer » ; le joueur choisit un fichier avec le sélecteur du téléphone ; le jeu le contrôle (RG-72) ; il affiche alors un résumé (date de la sauvegarde, nombre de records, nombre de skins débloqués) et « Fusionner avec la progression de ce téléphone ? » avec « Fusionner » et « Annuler ». Succès : « Restauration terminée : N records, M skins débloqués. » (totaux après fusion).
  - RG-72 (source BES-15, cas « fichier abîmé, modifié, d'une autre application, ou vide ») (modifiée en v1.1) : le fichier est refusé s'il est vide, dépasse 256 Kio (262 144 octets ; contrôle fait avant toute lecture du contenu), n'est pas une sauvegarde de ce jeu, échoue au contrôle d'intégrité ou contient une valeur hors des contraintes du dictionnaire (§ 5.1) : « Ce fichier n'est pas une sauvegarde valide de Serpent Cosmique. Rien n'a été modifié. (E-01) ». Un fichier d'une version de format plus récente que celle du jeu est refusé : « Cette sauvegarde vient d'une version plus récente du jeu. Installez la dernière version puis réessayez. Rien n'a été modifié. (E-02) ». Un fichier d'une version de format plus ancienne est accepté.
  - RG-73 (source BES-15, ENF-14, HYP-43) (modifiée en v1.2) : la fusion est entière ou nulle : en cas d'échec ou de fermeture du jeu pendant la fusion, la progression du téléphone est celle d'avant la restauration. Si l'enregistrement de la progression fusionnée échoue (espace insuffisant, écriture refusée), le message « La restauration n'a pas pu être enregistrée. Votre progression n'a pas changé. (E-07) » s'affiche à la place du message de succès. « Annuler » ne modifie rien.
- **Critères d'acceptation** :
  - CA-1 : Étant donné le déroulé de SCN-04, quand le demandeur restaure sur le nouveau téléphone le fichier créé sur son S22 et confirme, alors ses records, skins débloqués et choisis, et réglages sont présents.
  - CA-2 : Étant donné un fichier de sauvegarde dont un caractère a été modifié, un fichier vide ou une photo, quand le joueur le restaure, alors le message E-01 s'affiche et records, skins, réglages et compteurs sont inchangés.
  - CA-3 : Étant donné un téléphone ayant 6 records Classique dont 2 figurent aussi dans le fichier, et un fichier contenant 7 records Classique, quand le joueur fusionne, alors le tableau Classique contient les 10 meilleurs des 11 records distincts ; restaurer le même fichier une seconde fois ne change rien.
  - CA-4 : Étant donné le résumé de restauration affiché, quand le joueur touche « Annuler », alors aucune donnée n'est modifiée.
  - CA-5 (ajouté en v1.2) : Étant donné un fichier valide et un téléphone dont le stockage refuse l'enregistrement de la progression fusionnée (espace plein ou écriture simulée en échec en recette), quand le joueur touche « Fusionner », alors le message E-07 s'affiche, aucun message de succès n'apparaît, et après fermeture et réouverture du jeu les records, skins, compteurs et réglages sont ceux d'avant la restauration.

### EF-25 — Pause manuelle, reprise et abandon
- **Source** : BES-16, BES-09
- **Priorité** : Must
- **Description** : En tant que joueur, je veux mettre la partie en pause, la reprendre ou l'abandonner afin de jouer à mon rythme.
- **Règles métier** :
  - RG-74 (source BES-16, HYP-03, HYP-26) : un bouton pause d'au moins 9 mm × 9 mm est affiché pendant toute la partie ; le bouton retour du téléphone, pendant une partie, a le même effet. L'écran de pause affiche « Pause », « Reprendre » et « Abandonner ». « Abandonner » demande « Abandonner la partie ? Votre score de N points sera conservé. » avec « Oui » et « Non » ; « Oui » termine la partie par « Partie abandonnée » (RG-44).
  - RG-75 (source BES-16, BES-05) : en pause, le serpent est figé, tous les temps (chrono, effets, durée de vie du bonbon spécial) sont figés, la file de commandes est vidée (RG-27) et la musique s'arrête.
  - RG-76 (source BES-16, HYP-27) : « Reprendre » affiche un compte à rebours de 3 secondes, puis le serpent repart de la même position, dans la même direction, avec les temps restants.
- **Critères d'acceptation** :
  - CA-1 : Étant donné le déroulé de SCN-05 en mode Contre la montre, quand le joueur touche « Reprendre » après l'appel, alors un compte à rebours de 3 secondes s'affiche puis le serpent repart avec le temps restant d'avant l'appel.
  - CA-2 : Étant donné l'écran de pause d'une partie Classique à 9 points, quand le joueur touche « Abandonner » puis « Non », alors l'écran de pause reste affiché ; avec « Oui », l'écran de fin affiche « Partie abandonnée » et 9 points.
  - CA-3 : Étant donné une partie en cours, quand le joueur appuie sur le bouton retour du téléphone, alors l'écran de pause s'affiche et le jeu ne se ferme pas.

### EF-26 — Pause automatique en cas d'interruption
- **Source** : BES-16, BES-01
- **Priorité** : Must
- **Description** : En tant que joueur, je veux que la partie se fige d'elle-même quand le téléphone m'interrompt afin de ne pas perdre à cause d'un appel.
- **Règles métier** :
  - RG-77 (source BES-16, HYP-03, HYP-23) : la partie passe en pause immédiatement, sans qu'aucun pas ne soit fait après l'événement (tolérance : 1 pas), dès que le jeu perd le premier plan ou la saisie : appel entrant, ouverture du volet de notifications, toucher d'une notification, verrouillage ou extinction de l'écran, passage à une autre application, affichage en orientation verticale (RG-81). Une partie en compte à rebours de départ ou de reprise passe aussi en pause.
  - RG-78 (source BES-16) : au retour dans le jeu, l'écran de pause est affiché ; la partie ne reprend jamais sans que le joueur touche « Reprendre ».
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie en cours, quand le joueur verrouille l'écran puis le déverrouille 1 minute plus tard, alors l'écran de pause s'affiche et le serpent est à la même position qu'au verrouillage, à un pas près.
  - CA-2 : Étant donné une partie Contre la montre en cours, quand le joueur ouvre le volet de notifications puis le referme, alors le chrono n'a pas avancé pendant ce temps et la partie attend « Reprendre ».
  - CA-3 : Étant donné un appel reçu pendant une partie, quand l'appel se termine et que le joueur revient dans le jeu, alors aucun mouvement du serpent n'a lieu avant qu'il touche « Reprendre ».

### EF-27 — Partie interrompue par la fermeture du jeu
- **Source** : BES-01, BES-16
- **Priorité** : Must
- **Description** : En tant que joueur, je veux que ma progression soit préservée même si le jeu est fermé au milieu d'une partie afin de ne rien perdre de ce que j'ai acquis.
- **Règles métier** :
  - RG-79 (source BES-01, cas « le joueur quitte le jeu au milieu d'une partie », HYP-22, HYP-44, HYP-51) (modifiée en v1.2 : annonce des déblocages au lancement ; en v1.5 : borne du nombre de bonbons mangés) : l'état utile d'une partie en cours (mode, score de 0 à 9 999, bonbons mangés de 0 à 9 999, date et heure ; le nombre de bonbons mangés n'est pas limité à la taille de l'aire de jeu, car les modes Zen et Bonus et pièges permettent davantage, et il est enregistré tel quel, jamais tronqué en dessous de cette borne) est enregistré durablement à chaque bonbon mangé et à chaque mise en pause. Si le jeu est fermé complètement (par le joueur ou par le téléphone) avant la fin de la partie, celle-ci est clôturée au lancement suivant comme « Partie abandonnée » avec le dernier état enregistré : compteurs mis à jour (RG-45), déblocages vérifiés (RG-56), record éventuel avec saisie du nom (RG-50). Le message « Votre dernière partie (<mode>, <score> points) a été interrompue ; elle a été enregistrée. » s'affiche avant le menu principal, suivi des déblocages obtenus par cette partie (« Nouveau skin débloqué : <nom> » pour chaque skin, RG-58 ; « Nouveau mode découvert : Constellation », RG-40), comme sur un écran de fin. La partie elle-même ne peut pas être reprise.
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie Classique à 12 points mise en pause, quand le jeu est fermé de force puis rouvert, alors le message de partie interrompue indique « Classique, 12 points », puis la saisie du nom s'affiche si 12 points entrent au tableau, et le total de bonbons a augmenté de 12.
  - CA-2 : Étant donné aucune partie en cours à la fermeture, quand le jeu est rouvert, alors le menu principal s'affiche directement, sans message.
  - CA-3 : Étant donné une partie interrompue, quand le jeu est rouvert deux fois de suite, alors la partie n'est enregistrée qu'une seule fois.
  - CA-4 (ajouté en v1.2) : Étant donné un total de 95 bonbons et une partie interrompue après 6 bonbons mangés, quand le jeu est fermé de force puis rouvert, alors le message de partie interrompue est suivi de « Nouveau skin débloqué : Poussière d'étoiles », et ce skin peut être choisi ; à un second lancement, l'annonce ne réapparaît pas.

### EF-28 — Orientation horizontale
- **Source** : BES-01
- **Priorité** : Must
- **Description** : En tant que joueur, je veux jouer téléphone tenu à l'horizontale, dans un sens ou dans l'autre, afin de jouer confortablement.
- **Règles métier** :
  - RG-80 (source BES-01, contrainte « orientation horizontale ») : tous les écrans s'affichent à l'horizontale ; retourner le téléphone de 180° retourne l'affichage.
  - RG-81 (source BES-01, contrainte « orientation horizontale », HYP-31) (modifiée en v1.1 : source HYP-31 ajoutée, cas attendu sur iPhone où l'orientation ne peut pas être imposée) : si le jeu se trouve affiché en orientation verticale, il affiche seulement « Tournez votre téléphone à l'horizontale » et une partie en cours passe en pause (RG-77).
- **Critères d'acceptation** :
  - CA-1 : Étant donné une partie en cours, quand le joueur retourne le téléphone de 180° en restant à l'horizontale, alors l'affichage se retourne et la commande « haut » fait toujours monter le serpent vers le haut de l'écran vu par le joueur.
  - CA-2 : Étant donné une partie en cours, quand le téléphone est tenu verticalement avec la rotation automatique activée, alors aucun écran vertical de jeu ne s'affiche (soit l'affichage reste horizontal, soit le message de RG-81 s'affiche et la partie est en pause).

### EF-29 — Mise à jour proposée depuis « À propos » (ajoutée en v1.1)
- **Source** : 01 § 6 (maintenance : « une nouvelle version s'installe comme la première, sans perdre la progression ; pas de mise à jour automatique »), HYP-04, HYP-30 ; aucun BES propre
- **Priorité** : Must
- **Description** : En tant que demandeur ou ami, je veux qu'une nouvelle version me soit proposée et ne s'installe que si je l'accepte afin de profiter des corrections sans jamais perdre ma progression ni subir de changement imposé.
- **Règles métier** :
  - RG-89 (source HYP-04, HYP-30) : quand le jeu est ouvert avec une connexion et qu'une version plus récente a été publiée, « À propos » affiche « Nouvelle version X.Y.Z disponible » et un bouton « Installer », et un repère discret apparaît sur l'accès aux réglages du menu principal. Aucune nouvelle version n'est téléchargée ni installée sans toucher de « Installer ». La proposition n'apparaît que dans les menus, jamais pendant une partie.
  - RG-90 (source 01 § 6, ENF-18) : après le toucher de « Installer », la nouvelle version est téléchargée, son intégrité est vérifiée, puis elle remplace l'ancienne ; le jeu redémarre et affiche « Serpent Cosmique a été mis à jour en version X.Y.Z. Votre progression est conservée. ». Records, dernier nom, skins, compteurs et réglages sont conservés ; ils sont relus et contrôlés comme à chaque démarrage (RG-84), et convertis si leur format a changé.
  - RG-91 (source 01 § 6 « fiabilité ») : si la mise à jour échoue (connexion perdue, fichier altéré), la version en place reste utilisable, hors ligne comprise, avec toute sa progression, et le message « La mise à jour n'a pas pu être installée. Votre version actuelle reste disponible. Réessayez avec une connexion. (E-06) » s'affiche.
  - RG-92 (source ENF-01) : ouvert depuis son lien sans être installé, le jeu affiche un panneau « Installer le jeu » qui décrit les gestes d'installation propres au téléphone utilisé (Android ou iPhone).
- **Critères d'acceptation** :
  - CA-1 : Étant donné la version 1.0.0 installée et une version 1.1.0 publiée, quand le joueur ouvre le jeu avec une connexion, alors « À propos » affiche « Nouvelle version 1.1.0 disponible » et « Installer » ; s'il ferme et rouvre le jeu sans toucher « Installer », la version affichée reste 1.0.0.
  - CA-2 : Étant donné cette proposition affichée et une progression comprenant des records, des skins débloqués et des réglages modifiés, quand le joueur touche « Installer », alors le jeu redémarre avec le message de RG-90, « À propos » affiche 1.1.0 et records, skins et réglages sont identiques.
  - CA-3 : Étant donné une mise à jour en cours, quand la connexion est coupée avant la fin, alors le message E-06 s'affiche, la version 1.0.0 fonctionne ensuite en mode avion et la progression est intacte.
  - CA-4 : Étant donné une version plus récente publiée et une partie en cours, quand le jeu détecte cette version, alors rien ne s'affiche pendant la partie ; la proposition n'apparaît que dans « À propos » et sur le menu principal.
  - CA-5 : Étant donné le téléphone en mode avion, quand le joueur ouvre « À propos », alors aucune proposition ni aucune erreur de mise à jour ne s'affiche et l'état « Prêt à jouer hors ligne » est visible.

## 4. Exigences non fonctionnelles
Chaque ENF est quantifiée et vérifiable.

| ID | Catégorie | Exigence quantifiée | Méthode de vérification |
|---|---|---|---|
| ENF-01 | Installation | Sur chacun des systèmes de ENF-03, une personne seule installe le jeu en suivant le guide en 3 étapes au plus, depuis le téléphone seul (sans ordinateur ni câble), sans compte payant, sans compte de développeur, sans activer de mode développeur, avec une seule connexion réseau pendant l'installation, pour un coût de 0 €, en 10 minutes au plus. | test d'installation propre chronométré sur le S22 (ou un Android équivalent) et sur un iPhone, en suivant uniquement le guide |
| ENF-02 | Installation | Espace occupé sur le téléphone après installation : 50 Mo au plus, progression comprise. | relevé dans les informations de stockage du téléphone |
| ENF-03 | Compatibilité | Fonctionne sur : le Samsung Galaxy S22 avec sa version d'Android à jour ; tout téléphone Android sorti depuis le 01/11/2021 sous Android 12 ou ultérieur ; tout iPhone sorti depuis le 01/11/2021 (iPhone SE de 3e génération, iPhone 13 et modèles suivants) sous iOS 17 ou ultérieur. | recette sur le S22 ou un Android 12+ équivalent, sur au moins un iPhone, et sur simulateurs ou émulateurs pour les versions non disponibles physiquement |
| ENF-04 | Compatibilité (affichage) | Affichage horizontal dans les deux sens, sur écrans de 4,7 à 6,9 pouces de diagonale et de format 16:9 à 21:9 : la grille 24 × 12 est entièrement visible, ses cases mesurent au moins 3 mm de côté (au moins 4 mm sur le S22), et aucune case, aucun bouton ni aucun texte n'est caché par l'encoche, la caméra ou les coins arrondis. | captures d'écran mesurées sur S22 et sur le plus petit et le plus allongé des écrans visés (appareil ou simulateur), en mode « Glissement » et « Flèches » |
| ENF-05 | Performance | Démarrage à froid (toucher de l'icône → menu principal utilisable) : 3 s au plus sur le S22, 5 s au plus sur les autres téléphones de ENF-03 ; lancement d'une partie (toucher du mode → compte à rebours affiché) : 1 s au plus ; passage d'un écran à l'autre : 0,5 s au plus. | chronométrage de 5 essais après redémarrage du téléphone, la valeur la plus lente devant respecter le seuil |
| ENF-06 | Performance (fluidité) | Sur le S22, pendant 5 minutes à 12 c/s avec un serpent d'au moins 200 cases : 95 % des intervalles entre deux pas à ± 10 % de l'intervalle nominal, aucun intervalle supérieur au double ; affichage d'au moins 50 images par seconde en moyenne. Sur les autres téléphones de ENF-03 : mêmes intervalles, affichage d'au moins 30 images par seconde. | relevé des instants des pas sur une partie de recette, ou capture vidéo à haute fréquence |
| ENF-07 | Performance (réactivité) | Une commande reçue avant un pas est appliquée à ce pas (dans la limite de la file de RG-25) ; le retour visuel d'une flèche touchée apparaît en 100 ms au plus. | capture vidéo à haute fréquence de 20 commandes, en « Glissement » et en « Flèches » |
| ENF-08 | Volumétrie | Le jeu gère sans dégradation : 7 tableaux de 10 records (70 lignes), 16 skins, un serpent jusqu'à 288 cases, des compteurs jusqu'à 1 000 000 000 ; fichier de sauvegarde de 50 Ko au plus avec tous les tableaux pleins et des noms de 12 caractères. | jeu de données de recette maximal, puis vérification de ENF-06 en mode Zen avec un serpent de 280 cases |
| ENF-09 | Hors ligne (modifiée en v1.1) | Après l'installation, toutes les exigences fonctionnelles sont satisfaites en mode avion, téléphone redémarré compris, et le jeu n'échange rien (0 octet) en mode avion. Téléphone connecté, le seul échange admis est la vérification de version à l'ouverture du jeu (10 Ko au plus par ouverture, aucune donnée du joueur) et, sur toucher de « Installer », le téléchargement de la nouvelle version (EF-29, HYP-30). | recette complète en mode avion après redémarrage ; relevé de la consommation de données par application du téléphone sur 7 jours, et inspection des échanges réseau d'une ouverture connectée |
| ENF-10 | Ergonomie (prise en main) | Une personne qui n'a jamais vu le jeu lance une partie en 30 s au plus après l'ouverture, sans aide (3 personnes sur 3) ; 2 touchers au plus du menu principal à une partie, et du menu principal à la création ou à la restauration d'une sauvegarde ; règle de chaque mode en 2 phrases et 200 caractères au plus. | test avec 3 personnes extérieures à l'équipe projet, chronométré ; comptage des touchers ; relecture des textes |
| ENF-11 | Ergonomie (lisibilité) | Sur chacun des 4 décors : rapport de contraste d'au moins 3:1 entre le fond et chaque élément de jeu (serpent dans chacune des 4 couleurs et en arc-en-ciel, chaque bonbon, astéroïde, trou noir) ; d'au moins 4,5:1 pour tout texte. Les 4 couleurs de bonbons sont identifiées sans erreur par 3 personnes sur 3, à bout de bras, grâce à la couleur et à la silhouette (RG-12). | mesure des contrastes sur captures d'écran ; test d'identification avec 3 personnes |
| ENF-12 | Accessibilité | Zones tactiles d'au moins 9 mm × 9 mm (flèches : 12 mm × 12 mm) ; hauteur des majuscules d'au moins 1,8 mm pour tout texte sur le S22 ; aucun élément qui clignote ou change de couleur plus de 3 fois par seconde ; jouable entièrement avec la commande « Flèches » sans aucun glissement. | mesures sur captures d'écran du S22 ; analyse vidéo des animations (arc-en-ciel, effets) |
| ENF-13 | Langue | 100 % des textes affichés en français (menus, règles, messages d'erreur, noms de modes et de skins) ; dates au format JJ/MM/AAAA, heure locale du téléphone ; nombres en notation française (espace pour les milliers). | relecture exhaustive des écrans et des messages |
| ENF-14 | Conservation des données | Toute modification de la progression (records, nom, skins, compteurs, réglages, partie en cours) est enregistrée durablement en 1 s au plus et avant l'affichage de l'écran de fin. Sur 20 fermetures forcées, redémarrages ou extinctions brutales, aucune perte d'une donnée enregistrée plus de 1 s avant. Une écriture interrompue laisse la progression dans son état d'avant ou d'après, jamais incomplète. Les données restent sur le téléphone jusqu'à la désinstallation ou l'effacement des données du jeu. | 20 essais de fermeture forcée et d'extinction pendant une partie et juste après un record ou un réglage, puis contrôle des données |
| ENF-15 | Sauvegarde (modifiée en v1.4) | Création d'un fichier de sauvegarde en 2 s au plus, restauration en 3 s au plus (hors temps de choix du fichier) ; tout fichier créé par une version du jeu est accepté par toute version ultérieure ; le jeu ne supprime jamais un fichier de sauvegarde et n'en remplace jamais un de lui-même : un fichier existant n'est remplacé que si le joueur l'a choisi lui-même dans la fenêtre d'enregistrement du téléphone et a confirmé le remplacement (RG-69, HYP-50). | chronométrage avec le jeu de données maximal de ENF-08 ; restauration d'un fichier de la version précédente à chaque nouvelle version ; 10 sauvegardes successives sans choix d'emplacement, puis contrôle qu'aucun fichier antérieur n'a changé ; remplacement confirmé, puis refusé (EF-23 CA-4) |
| ENF-16 | Journalisation et diagnostic (modifiée en v1.1, en v1.2, puis en v1.3) | Aucun journal ni aucune donnée n'est transmis hors du téléphone ; le jeu n'écrit aucun nom de joueur ailleurs que dans sa progression et dans les fichiers de sauvegarde demandés. Chaque erreur présentée au joueur comporte un message en français et un code court listé dans le guide utilisateur : E-01 fichier de sauvegarde invalide ; E-02 sauvegarde d'une version plus récente ; E-03 espace de stockage insuffisant ; E-04 écriture de la sauvegarde impossible ; E-05 progression du téléphone illisible au démarrage (RG-84) ; E-06 mise à jour impossible (RG-91) ; E-07 restauration impossible à enregistrer (RG-73) ; E-08 progression impossible à enregistrer sur le téléphone, message non bloquant (RG-93). | revue des messages ; inspection des fichiers écrits par le jeu ; test de chaque code |
| ENF-17 | Sobriété et confidentialité | Aucune permission demandée hormis la vibration et l'accès au fichier choisi par le joueur pour la sauvegarde ou la restauration ; aucune publicité, aucun achat, aucun compte, aucun service externe ; aucune donnée personnelle hormis le pseudonyme saisi. | revue des permissions demandées à l'installation et au premier usage ; parcours complet du jeu |
| ENF-18 | Maintenabilité (durée de vie) | Une nouvelle version s'installe comme la première et conserve 100 % de la progression ; aucune mise à jour automatique ; le jeu installé fonctionne au moins 5 ans sans connexion, sans réinstallation et sans renouvellement (aucune date d'expiration, aucun abonnement ni certificat à renouveler par le joueur) ; numéro de version au format MAJEUR.MINEUR.CORRECTIF visible dans « À propos ». | installation d'une version N+1 par-dessus une version N avec progression complète ; revue des conditions de validité de la forme de distribution retenue |
| ENF-19 | Maintenabilité (règles du jeu) | Chaque valeur des règles du jeu (dimensions de la grille, vitesses, durées, seuils, nombre d'obstacles, catalogue et conditions des skins) est définie à un seul endroit du code source ; tout tirage au hasard est reproductible à partir d'une valeur de départ, pour la recette. | revue de code ; rejouer deux fois une partie de recette avec la même valeur de départ et les mêmes commandes donne les mêmes positions de bonbons et d'obstacles |
| ENF-20 | Fiabilité | Aucun arrêt inattendu ni blocage du jeu pendant 2 heures de jeu continu réparties sur les 7 modes, ni pendant 50 cycles pause/reprise et 20 sauvegardes/restaurations. | session de recette d'endurance sur le S22 |

## 5. Données
### 5.1 Dictionnaire
Identifiants des modes : `classic` (Classique), `time-attack` (Contre la montre), `asteroids` (Champ d'astéroïdes), `black-hole` (Trou noir), `bonus-traps` (Bonus et pièges), `zen` (Zen), `constellation` (Constellation). Identifiants des skins : RG-54.

| Entité | Champ | Type | Obligatoire | Contraintes | Sensibilité |
|---|---|---|---|---|---|
| Record | mode | énuméré | oui | un des 7 identifiants de mode | Public |
| Record | nom | texte | oui | 1 à 12 caractères après nettoyage (RG-51) ; jamais interprété (RG-52) | Public (pseudonyme) |
| Record | score | entier | oui | 1 à 9 999 | Public |
| Record | dateHeure | date et heure locales | oui | à la seconde ; affichée JJ/MM/AAAA ; dans un fichier importé, au plus 24 h après l'heure du téléphone ; dans la progression du téléphone, toute date valide est acceptée, même future (RG-94) (modifiée en v1.3) | Public |
| Tableau des records | records | liste de Record | oui | 0 à 10 par mode, tous du même mode, triés selon RG-47 | Public |
| Dernier nom | valeur | texte | non | 0 à 12 caractères ; vide au premier lancement | Public |
| Réglages | commande | énuméré | oui | `swipe` (Glissement) ou `arrows` (Flèches) ; défaut `swipe` | Public |
| Réglages | bruitages | booléen | oui | défaut activé | Public |
| Réglages | musique | booléen | oui | défaut activé | Public |
| Réglages | vibrations | booléen | oui | défaut activé | Public |
| Skin (catalogue, fixe) | identifiant | texte | oui | un des 16 identifiants de RG-54 | Public |
| Skin (catalogue, fixe) | catégorie | énuméré | oui | `shape`, `pattern`, `trail` ou `decor` | Public |
| Skin (catalogue, fixe) | nom, condition, défaut | texte, texte, booléen | oui | selon RG-54 ; un seul skin par défaut par catégorie | Public |
| Progression des skins | débloqués | ensemble d'identifiants de skin | oui | identifiants connus ; contient toujours les 4 skins par défaut ; ne fait que grandir (RG-57) | Public |
| Progression des skins | choisis | un identifiant par catégorie | oui | chaque identifiant est débloqué et de la bonne catégorie ; défaut : skins par défaut | Public |
| Compteurs | totalBonbons | entier | oui | 0 à 1 000 000 000 | Public |
| Compteurs | partiesParMode | 7 entiers, un par mode | oui | chacun 0 à 1 000 000 000 ; mode surprise découvert si leur somme ≥ 3 (RG-40) | Public |
| Partie interrompue | mode, score, bonbonsMangés, dateHeure | énuméré, entier, entier, date et heure | non (présente seulement pendant une partie) | score 0 à 9 999 ; bonbonsMangés 0 à 9 999, sans lien avec la taille de l'aire de jeu (HYP-51) (modifiée en v1.5) ; effacée dès que la partie est clôturée (RG-79) | Public |
| Fichier de sauvegarde | identifiantJeu | texte | oui | valeur fixe propre à Serpent Cosmique | Public |
| Fichier de sauvegarde | versionFormat | entier | oui | ≥ 1 et ≤ version de format connue du jeu (RG-72) | Public |
| Fichier de sauvegarde | dateCréation | date et heure | oui | date valide | Public |
| Fichier de sauvegarde | contenu | records des 7 modes, dernier nom, progression des skins, compteurs, réglages | oui | chaque valeur respecte les contraintes ci-dessus ; taille totale du fichier ≤ 256 Kio (50 Ko attendus, ENF-08) (modifiée en v1.1) | Public |
| Fichier de sauvegarde | contrôleIntégrité | valeur de contrôle | oui | détecte toute modification du contenu (RG-72) | Public |
| Partie (en mémoire, non conservée) | mode, score, bonbonsMangés, positions du serpent, direction, file de commandes (2 au plus), vitesse, couleur courante (`pink`, `purple`, `light-pink`, `light-blue`, `rainbow`), effet en cours et durée restante, temps restant, bonbons (position, couleur, type `normal`, `slow`, `turbo`, `shrink`, `reverse`, durée de vie), astéroïdes, trous noirs, constellation à tracer | divers | oui pendant la partie | selon les EF du mode | Public |

### 5.2 Règles de gestion transverses
| ID | Règle |
|---|---|
| RG-82 | (source RM-05, BES-11, BES-14) Il n'existe ni compte ni profil : réglages, skins débloqués et choisis, compteurs et dernier nom sont uniques et communs à tous les joueurs du téléphone ; seuls les records portent un nom. |
| RG-83 | (source 01 § 6 Attentes de qualité « fiabilité ») Toute modification de la progression est enregistrée durablement selon ENF-14 ; aucune fermeture, aucun redémarrage ni aucune interruption ne fait perdre records, skins, compteurs ou réglages déjà enregistrés. |
| RG-84 | (source 01 § 6 Attentes de qualité « fiabilité ») Si la progression enregistrée sur le téléphone est illisible au démarrage, le jeu utilise la dernière version lisible qu'il a enregistrée ; s'il n'en a aucune, il démarre avec les valeurs par défaut et affiche « Votre progression n'a pas pu être lue. Vous pouvez restaurer une sauvegarde depuis le menu Sauvegarde. (E-05) ». |
| RG-85 | (source 01 § 5 et § 7 « aucune donnée envoyée sur internet », « aucun service externe », HYP-30) (modifiée en v1.1) Après l'installation, le jeu n'établit aucune communication réseau, hormis la vérification de version et la mise à jour consentie d'EF-29, qui ne transmettent aucune donnée du joueur ; il ne collecte aucune donnée hormis le pseudonyme saisi pour les records. |
| RG-86 | (source BES-12, BES-13) Toute date est celle du téléphone au moment de l'événement (fin de partie pour un record) ; elle est affichée au format JJ/MM/AAAA. |
| RG-87 | (source BES-13, BES-15) Tout texte provenant d'un joueur ou d'un fichier de sauvegarde est affiché comme du texte brut et n'est jamais interprété ; toute donnée lue dans un fichier de sauvegarde est contrôlée selon le dictionnaire (§ 5.1) avant usage. |
| RG-88 | (source RM-01, RM-02, RM-03, RM-04, RM-07) Les règles de couleur (RG-11, RG-16, RG-17, RG-19) s'appliquent à l'identique dans les 7 modes et avec tous les skins ; aucun mode ni skin n'introduit de couleur de bonbon supplémentaire. |
| RG-93 | (source HYP-48, 01 § 6 « fiabilité ») (ajoutée en v1.3) Si la progression ne peut pas être enregistrée sur le téléphone (espace plein, stockage refusé), le jeu continue sans interruption et affiche un message non bloquant, qui disparaît de lui-même : « La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08) ». La progression reste en mémoire, et un nouvel enregistrement complet est tenté à l'écriture suivante (fin de partie, réglage, choix de skin, record) ; dès qu'il réussit, plus aucun message n'apparaît. |
| RG-94 | (source HYP-49, BES-15) (ajoutée en v1.3) Contrôle des dates : dans un fichier de sauvegarde importé, une date de record ou de création postérieure de plus de 24 h à l'heure du téléphone rend le fichier invalide (E-01, RG-72). Dans la progression enregistrée sur le téléphone, une date future (horloge avancée puis remise à l'heure) n'est jamais une cause de rejet ni de repli (RG-84) : le record est gardé et affiché avec sa date. |
| RG-95 | (source HYP-45) (ajoutée en v1.3) Bouton retour du téléphone : pendant une partie, il ouvre la pause (RG-74) ; hors partie, sur un écran secondaire (liste des modes, records, skins, réglages, sauvegarde, à propos), il agit comme « ‹ Retour » et affiche l'écran précédent ; sur le menu principal, il quitte le jeu comme toute application. Sur l'écran de saisie du nom, il applique RG-53. |

## 6. Hors périmètre et évolutions possibles
Hors périmètre (repris de 01 § 8) :
- Jeu en ligne, multijoueur en réseau, classement partagé sur internet.
- Comptes, connexion, synchronisation automatique entre téléphones (le transfert du fichier de sauvegarde se fait hors du jeu, par les moyens du téléphone).
- Publicité, achats, monnaie payante.
- Publication dans un magasin d'applications.
- Langues autres que le français.
- Tenue verticale du téléphone.
- Profils de joueurs séparés.

Hors périmètre ajouté par l'équipe projet :
- Reprise exacte d'une partie après fermeture complète du jeu (la partie est clôturée comme abandonnée, RG-79).
- Modification des réglages ou des skins depuis l'écran de pause.
- Effacement des records ou réinitialisation de la progression depuis le jeu (possible seulement en effaçant les données du jeu dans le téléphone).
- Commande au clavier ou à la manette.

Évolutions possibles (non engagées) :
- Aspiration des trous noirs (attraction du serpent à proximité) en plus de la téléportation.
- Niveaux de difficulté (vitesse de départ réglable) et réglage du volume.
- Nouveaux skins, nouveaux modes surprises, nouvelles constellations à thème.
- Partage d'une image de record.
- Reprise exacte d'une partie interrompue.

## 7. Hypothèses
| ID | Hypothèse | Origine | Conséquence si elle est fausse |
|---|---|---|---|
| HYP-01 | L'arc-en-ciel dure jusqu'au bonbon suivant | équipe projet, validée par le demandeur | ajuster la durée de l'effet |
| HYP-02 | À la restauration, les progressions sont fusionnées après confirmation ; un fichier abîmé est refusé sans rien modifier | équipe projet, validée par le demandeur | proposer un remplacement complet |
| HYP-03 | Pause automatique en cas d'appel, de notification, de verrouillage ou de sortie de l'application ; bouton pause disponible | équipe projet, validée par le demandeur | revoir le comportement d'interruption |
| HYP-04 | Pas de mise à jour automatique ; une nouvelle version s'installe comme la première et conserve la progression | équipe projet, validée par le demandeur | prévoir un mécanisme de mise à jour |
| HYP-05 | Les règles fines (vitesse, murs, durée des effets, détails des modes), l'apparence générale, le catalogue de skins et leurs conditions de déblocage sont décidés par l'équipe projet | demandeur | revoir les règles ou l'apparence concernées |
| HYP-06 | Bruitages, musique et vibrations activés par défaut | équipe projet, validée par le demandeur | changer les valeurs par défaut |
| HYP-07 | Les amis possèdent des téléphones de moins de 5 ans, Android ou iPhone | demandeur | adapter la compatibilité |
| HYP-08 | Le jeu s'appelle « Serpent Cosmique » | équipe projet | renommer le jeu, les textes et le nom des fichiers de sauvegarde |
| HYP-09 | Grille fixe de 24 × 12 cases sur tous les téléphones (scores comparables) ; départ avec la tête et 3 anneaux (4 cases), tête en colonne 6 ligne 6 vers la droite ; compte à rebours de 3 s avant le premier pas | équipe projet | ajuster les dimensions ou la position de départ |
| HYP-10 | Vitesses : Classique et Trou noir 6 c/s + 0,2 par bonbon, 12 c/s au plus ; Contre la montre 8 ; Champ d'astéroïdes 7 ; Bonus et pièges 7 (4 sous Ralenti, 11 sous Turbo) ; Zen 6 ; Constellation 7 | équipe projet | ajuster les valeurs (centralisées, ENF-19) |
| HYP-11 | Les bords de la grille sont mortels dans tous les modes sauf Zen, où ils sont traversés ; la case libérée par la queue au même pas est libre | équipe projet | revoir la règle des bords par mode |
| HYP-12 | 1 point par bonbon (sauf Constellation) ; un score de 0 n'entre jamais au tableau ; une partie abandonnée est enregistrée comme les autres dans tous les modes | équipe projet | revoir le calcul du score ou l'entrée au tableau |
| HYP-13 | Contre la montre : 3 bonbons présents en permanence ; une collision termine la partie avant la fin des 60 s | équipe projet | autre nombre de bonbons, ou collision sans fin de partie |
| HYP-14 | Champ d'astéroïdes : 3 astéroïdes fixes au départ, 1 de plus tous les 5 bonbons, 30 au plus, jamais à moins de 4 cases de la tête | équipe projet | ajuster la progression ou rendre les astéroïdes mobiles |
| HYP-15 | Trou noir : 2 paires fixes de trous noirs qui téléportent la tête vers le trou jumeau ; pas d'attraction (le besoin cite « aspirent ou téléportent ») | équipe projet | ajouter l'aspiration (évolution possible) |
| HYP-16 | Bonus et pièges : un bonbon spécial tous les 3 bonbons, durée de vie 8 s, effets de 6 s (Ralenti, Turbo, Inversion), Rétrécissement immédiat de 3 anneaux, longueur minimale 4 cases ; un bonbon spécial porte l'une des 4 couleurs et un pictogramme | équipe projet | ajuster fréquences, durées et valeurs |
| HYP-17 | Le mode surprise est « Constellation » ; il se découvre après 3 parties terminées sur le téléphone, son emplacement verrouillé étant visible avant | équipe projet | rendre le mode disponible dès le départ ou concevoir un autre mode |
| HYP-18 | Catalogue de 16 skins (4 formes, 4 motifs, 4 traînées, 4 décors) et conditions de RG-54 ; la traînée « Poussière d'étoiles » à 100 bonbons reprend l'exemple de BES-11 | équipe projet | modifier le catalogue ou les seuils |
| HYP-19 | Chaque couleur de bonbon a sa propre silhouette, pour garantir que les quatre couleurs restent distinguables | équipe projet | revenir à des bonbons de même forme et renforcer l'écart entre les couleurs |
| HYP-20 | Les emojis sont acceptés dans les noms et comptent pour un caractère ; retours à la ligne et caractères de contrôle sont retirés | équipe projet | refuser les emojis à la saisie |
| HYP-21 | Fusion d'une sauvegarde : compteurs = plus grande valeur, skins choisis et dernier nom du fichier appliqués comme les réglages, records identiques comptés une fois ; fichier d'une version plus récente refusé | équipe projet | additionner les compteurs ou garder les choix du téléphone |
| HYP-22 | Une partie interrompue par la fermeture complète du jeu n'est pas reprise : elle est enregistrée comme abandonnée au lancement suivant, avec son dernier état enregistré | équipe projet | prévoir la reprise exacte de la partie |
| HYP-23 | Une notification met la partie en pause quand elle fait perdre au jeu le premier plan ou la saisie (volet ouvert, notification touchée, appel) ; une bannière que le joueur ignore et qui ne prend pas la main peut ne pas être détectable par le jeu | équipe projet | rechercher un moyen de détecter les bannières, ou accepter la limite |
| HYP-24 | « Moins de 5 ans » se traduit par : téléphones sortis depuis le 01/11/2021, sous Android 12 ou ultérieur, ou iOS 17 ou ultérieur, écrans de 4,7 à 6,9 pouces | équipe projet | élargir la compatibilité à des systèmes plus anciens |
| HYP-25 | L'installation se fait depuis le téléphone seul, sans ordinateur, y compris sur iPhone sans magasin d'applications | équipe projet | autoriser une étape sur ordinateur dans le guide |
| HYP-26 | Réglages et skins se modifient depuis le menu principal ; l'écran de pause propose seulement « Reprendre » et « Abandonner » | équipe projet | ajouter les réglages sonores à l'écran de pause |
| HYP-27 | La reprise après une pause est précédée d'un compte à rebours de 3 s | équipe projet | reprise immédiate au toucher de « Reprendre » |
| HYP-28 | Événements sonores et vibrations de RG-66 (vibration de 300 ms à la collision, de 80 ms au bonbon spécial) | équipe projet | ajuster la liste des événements |
| HYP-30 | Une nouvelle version est signalée dans « À propos » quand le téléphone est connecté et ne s'installe que si le joueur touche « Installer » ; pour la détecter, le téléphone interroge l'adresse officielle du jeu à son ouverture avec une connexion (quelques Ko, aucune donnée du joueur) ; aucun échange en mode avion (ajoutée en v1.1, reprise du dossier d'architecture) | équipe projet, conforme à HYP-04 | si aucun échange n'est admis même téléphone connecté, renoncer aux mises à jour sur place ; sur iPhone, une réinstallation ferait alors perdre la progression sans sauvegarde préalable |
| HYP-31 | Limites admises sur iPhone : pas de vibrations (RG-63), écran maintenu allumé seulement à partir d'iOS 18.4 (RG-10), orientation horizontale non imposée et remplacée par le message de RG-81 (ajoutée en v1.1, reprise du dossier d'architecture) | équipe projet | aucune solution gratuite et sans magasin d'applications ne lève ces limites sur iPhone |
| HYP-32 | Le code source et l'adresse du jeu peuvent être publics une fois le projet exporté dans son propre dépôt par le demandeur (réponse du 2026-11-01) ; d'ici là, le projet reste privé (reprise de 01 en v1.1) | demandeur | héberger le jeu chez un autre service gratuit, avec un accès de déploiement à protéger |
| HYP-43 | Si la restauration ne peut pas être enregistrée sur le téléphone, un message clair l'indique (E-07, RG-73) et la progression reste celle d'avant la restauration (reprise de 01 en v1.2) | équipe projet | revoir le message d'erreur |
| HYP-44 | Un skin débloqué par une partie interrompue, clôturée au lancement suivant, est annoncé à ce lancement comme tout autre déblocage (RG-58, RG-79) (reprise de 01 en v1.2) | équipe projet | supprimer l'annonce différée |
| HYP-45 | Hors partie, le bouton retour du téléphone agit comme « ‹ Retour » sur les écrans secondaires ; sur le menu principal, il quitte le jeu comme toute application (RG-95) (reprise de 01 en v1.3) | équipe projet | revoir la navigation par le bouton retour |
| HYP-46 | Quitter la saisie du nom sans toucher « Valider » garde le nom proposé, déjà enregistré au record ; un texte tapé mais non validé n'est pas retenu (RG-53) (ajoutée en v1.3) | équipe projet | retenir le texte affiché au moment de quitter |
| HYP-47 | Le nom finalement enregistré au record, « Joueur » compris, devient le dernier nom proposé ; le champ est vide au tout premier record du téléphone (RG-50, RG-53) (ajoutée en v1.3) | équipe projet | ne mémoriser que les noms saisis et validés par le joueur |
| HYP-48 | Si la progression ne peut pas être enregistrée sur le téléphone (espace plein, stockage refusé), un message clair le signale (E-08) ; la progression reste en mémoire et l'enregistrement est retenté à l'écriture suivante (RG-93) (reprise de 01 en v1.3) | équipe projet | supprimer le message |
| HYP-49 | Une date de record dans le futur (horloge du téléphone avancée puis remise à l'heure) ne fait jamais rejeter la progression enregistrée sur le téléphone ; seul un fichier de sauvegarde importé est contrôlé strictement, à 24 h près (RG-94) (reprise de 01 en v1.3) | équipe projet | durcir le contrôle local |
| HYP-50 | Le jeu ne remplace jamais de lui-même un fichier de sauvegarde ; si le joueur choisit lui-même, dans la fenêtre du téléphone, de remplacer un fichier existant et le confirme, le remplacement est accepté (RG-69, ENF-15) (reprise de 01 en v1.4) | équipe projet | refuser toute écriture dans un fichier existant |
| HYP-51 | Le nombre de bonbons mangés dans une partie n'est pas limité à la taille de l'aire de jeu (les modes Zen et Bonus et pièges permettent davantage) : il est borné à 9 999 comme le score, et n'est jamais tronqué en silence en dessous (RG-79, dictionnaire) (reprise de 01 en v1.5) | équipe projet | revoir la borne |

## 8. Glossaire
| Terme | Définition |
|---|---|
| Serpent | Personnage dirigé par le joueur, formé d'une tête et d'anneaux ; 4 cases au départ (tête et 3 anneaux) |
| Anneau | Case du corps du serpent derrière la tête |
| Grille, aire de jeu | Ensemble de 24 × 12 cases carrées sur lequel le serpent se déplace |
| Case libre | Case occupée ni par le serpent, ni par un bonbon, ni par un astéroïde, ni par un trou noir |
| Pas | Déplacement du serpent d'une case ; la vitesse se mesure en cases par seconde (c/s) |
| Bonbon | Élément à manger, d'une des quatre couleurs (rose, violet, rose clair, bleu clair), chacune avec sa silhouette |
| Bonbon spécial | Bonbon du mode Bonus et pièges qui déclenche un effet (Ralenti, Turbo, Rétrécissement, Inversion) |
| Effet | Modification temporaire (6 s) ou immédiate du serpent ou des commandes, déclenchée par un bonbon spécial |
| Couleur du serpent | Couleur de tout le serpent, donnée par le dernier bonbon mangé ; rose au départ |
| Arc-en-ciel | Apparence multicolore, seulement visuelle, prise à chaque dizaine de bonbons mangés, jusqu'au bonbon suivant |
| Astéroïde | Obstacle fixe d'une case du mode Champ d'astéroïdes ; le toucher termine la partie |
| Trou noir | Case du mode Trou noir qui téléporte la tête vers son trou jumeau |
| Constellation | Mode surprise : suite de 3 couleurs de bonbons à manger dans l'ordre pour gagner un bonus |
| Mode de jeu | Variante de règles choisie avant la partie ; 7 modes, dont le mode surprise |
| Mode de commande | Réglage « Glissement » ou « Flèches » |
| File de commandes | Commandes en attente (2 au plus) appliquées une par pas |
| Compte à rebours | Décompte de 3 s avant le premier pas et avant chaque reprise |
| Partie | Session de jeu, du départ jusqu'à la collision, la fin du temps, la victoire ou l'abandon |
| Victoire | Fin de partie quand aucune case libre ne reste pour placer un bonbon |
| Abandon | Fin de partie volontaire depuis l'écran de pause, ou clôture d'une partie interrompue par la fermeture du jeu |
| Skin | Apparence débloquable : forme, motif, traînée ou décor ; ne change jamais la couleur du serpent |
| Record | Score faisant entrer une partie dans les 10 meilleurs d'un mode |
| Tableau des records | Liste des 10 meilleurs scores d'un mode, avec rang, nom, score et date |
| Compteurs | Total de bonbons mangés et nombre de parties terminées par mode, communs au téléphone |
| Sauvegarde | Fichier contenant records, dernier nom, skins, compteurs et réglages, créé à la demande |
| Restauration, fusion | Lecture d'une sauvegarde et réunion de son contenu avec la progression du téléphone |
| Progression | Ensemble des données conservées sur le téléphone : records, dernier nom, skins, compteurs, réglages |
| Mise à jour | Remplacement de la version installée par une version plus récente, proposée dans « À propos » et faite seulement au toucher de « Installer », progression conservée |

## 9. Matrice besoins → exigences
| Besoin | Exigences |
|---|---|
| BES-01 | EF-01, EF-02, EF-03, EF-16, EF-26, EF-27, EF-28, ENF-03, ENF-04, ENF-05, ENF-06, ENF-09, ENF-10, ENF-11, ENF-20 |
| BES-02 | EF-03, EF-04, EF-05, ENF-11, ENF-12 |
| BES-03 | EF-06, EF-07, EF-08, EF-21, ENF-07, ENF-12 |
| BES-04 | EF-09 |
| BES-05 | EF-10 |
| BES-06 | EF-11 |
| BES-07 | EF-12 |
| BES-08 | EF-13 |
| BES-09 | EF-14, EF-25 |
| BES-10 | EF-01, EF-15 |
| BES-11 | EF-16, EF-19, EF-20 |
| BES-12 | EF-16, EF-17 |
| BES-13 | EF-16, EF-18 |
| BES-14 | EF-21, EF-22 |
| BES-15 | EF-23, EF-24, ENF-08, ENF-14, ENF-15, ENF-16 |
| BES-16 | EF-25, EF-26, EF-27 |
| Objectifs, attentes de qualité et contraintes (01 § 2, § 6, § 7) | EF-29, ENF-01, ENF-02, ENF-13, ENF-14, ENF-17, ENF-18, ENF-19 |

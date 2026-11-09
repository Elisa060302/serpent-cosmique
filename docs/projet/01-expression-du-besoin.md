# Expression du besoin — Jeu de serpent spatial

| Élément | Valeur |
|---|---|
| Projet | jeu-serpent |
| Demandeur | particulier, joueur et futur utilisateur principal |
| Titulaire des droits (licence, mentions légales, auteur des publications) | CocoClaudo (pseudonyme) |
| Version | 1.0 |
| Date de validation | 2026-11-01 |

## 1. Contexte et problème
Le demandeur veut sa propre version d'un jeu de serpent (genre classique : un serpent avance sur une grille, mange des éléments, grandit et perd s'il se percute), pour le plaisir, sur son téléphone. Les jeux du genre disponibles ne lui offrent ni l'univers qu'il veut (espace et bonbons), ni les modes « fun et ludiques » et les apparences personnalisées qu'il imagine. Le jeu doit fonctionner sans aucune connexion pendant le jeu. Il s'agit d'un projet personnel, sans enjeu financier : une erreur n'a d'autre conséquence qu'une partie gâchée ou une progression perdue, ce qui doit être évité.

Le jeu est une création originale dans ce genre (nom, visuels, règles propres), et non la copie d'un jeu existant.

### Glossaire
| Terme métier | Définition | Exemple |
|---|---|---|
| Serpent | Personnage dirigé par le joueur, formé d'une tête et d'anneaux ; il grandit d'un anneau à chaque bonbon mangé | serpent de 3 anneaux en début de partie |
| Bonbon | Élément à manger qui apparaît sur l'aire de jeu ; il a une couleur parmi quatre | bonbon violet |
| Couleur du serpent | Couleur affichée de tout le serpent, déterminée par le dernier bonbon mangé | serpent bleu clair après un bonbon bleu clair |
| Arc-en-ciel | Apparence décorative multicolore prise par le serpent à chaque dizaine de bonbons mangés | au 10e bonbon de la partie |
| Mode de jeu | Variante de règles choisie avant la partie | Classique, Zen |
| Skin | Apparence débloquable du serpent ou du décor : forme, motif, traînée ou décor | forme « comète », traînée « poussière d'étoiles » |
| Record | Score faisant entrer une partie dans les 10 meilleurs d'un mode | 42 points en mode Classique |
| Tableau des records | Liste des 10 meilleurs scores d'un mode, avec nom, score et date | |
| Sauvegarde | Fichier contenant la progression : records, skins débloqués, réglages | fichier enregistré dans les téléchargements du téléphone |
| Partie | Une session de jeu, du départ jusqu'à la défaite, la fin du temps ou l'abandon | |

## 2. Objectifs et critères de succès
| ID | Objectif | Critère de succès mesurable |
|---|---|---|
| OBJ-01 | Jouer sans réseau | Après l'installation, toutes les fonctions marchent en mode avion, téléphone redémarré compris |
| OBJ-02 | Installer facilement | Le demandeur installe le jeu sur son Samsung Galaxy S22 seul, en suivant le guide, avec une seule connexion au moment de l'installation |
| OBJ-03 | S'amuser avec un univers personnel | Les 6 modes demandés et le mode surprise sont jouables, dans le thème espace et bonbons, avec les règles de couleur du § 4 |
| OBJ-04 | Garder et transmettre sa progression | Une sauvegarde faite sur un téléphone, restaurée sur un autre, retrouve les records, les skins débloqués et les réglages |
| OBJ-05 | Partager avec un ou deux amis | Le jeu s'installe et fonctionne sur un téléphone Android et sur un iPhone de moins de 5 ans |

## 3. Utilisateurs et contexte d'usage
| Profil | Nombre | Aisance numérique | Appareils et systèmes | Droits d'installation | Contexte (bureau, mobilité, hors ligne, accessibilité) |
|---|---|---|---|---|---|
| Joueur principal (demandeur) | 1 | à l'aise avec un téléphone | Samsung Galaxy S22 (Android, acheté en 2022) | téléphone personnel, peut installer | partout, sans réseau, téléphone tenu à l'horizontale |
| Amis du demandeur | 1 à 2 | à l'aise avec un téléphone | Android ou iPhone de moins de 5 ans, modèle inconnu | téléphones personnels | idem |

Tous les joueurs sont des adultes ; aucun enfant. Plusieurs personnes peuvent jouer sur le même téléphone.

### Parties prenantes
Aucune autre partie prenante : projet personnel, sans organisation, sans service informatique, sans diffusion publique.

## 4. Besoins
Chaque besoin dit ce que l'utilisateur doit pouvoir faire, avec un exemple concret. Priorité MoSCoW : Must (sans quoi l'outil ne sert à rien), Should, Could, Won't (cette fois-ci).

| ID | Besoin | Exemple concret | Priorité |
|---|---|---|---|
| BES-01 | Jouer à un jeu de serpent dans un univers spatial où le serpent mange des bonbons, téléphone à l'horizontale | le serpent rose avance sur un fond étoilé et mange un bonbon violet | Must |
| BES-02 | Voir le serpent changer de couleur selon les bonbons mangés et devenir arc-en-ciel à chaque dizaine (règles RM-01 à RM-04) | après un bonbon bleu clair, le serpent devient bleu clair | Must |
| BES-03 | Diriger le serpent au choix avec des flèches à l'écran ou en glissant le doigt, selon un réglage | le joueur choisit « glisser » dans les réglages, puis glisse vers le haut : le serpent monte | Must |
| BES-04 | Jouer au mode Classique : le serpent grandit, la vitesse augmente peu à peu, la partie s'arrête quand il se percute | après 15 bonbons, le serpent va nettement plus vite qu'au départ | Must |
| BES-05 | Jouer au mode Contre la montre : manger le plus de bonbons possible en 60 secondes | à la fin des 60 secondes, la partie s'arrête et affiche 23 bonbons | Should |
| BES-06 | Jouer au mode Champ d'astéroïdes : éviter des astéroïdes de plus en plus nombreux | au 20e bonbon, de nouveaux astéroïdes sont apparus ; en toucher un met fin à la partie | Should |
| BES-07 | Jouer au mode Trou noir : des trous noirs aspirent ou téléportent le serpent d'un point à un autre de l'aire de jeu | le serpent entre dans un trou noir à gauche et ressort par un autre à droite | Should |
| BES-08 | Jouer au mode Bonus et pièges : des bonbons spéciaux ralentissent, accélèrent, rétrécissent le serpent ou inversent les commandes pendant un temps | après un bonbon « inversion », glisser vers la gauche fait aller à droite pendant quelques secondes, avec un indicateur visible | Should |
| BES-09 | Jouer au mode Zen : on ne perd jamais, pour se détendre | le serpent traverse son propre corps sans fin de partie ; le joueur quitte quand il veut | Should |
| BES-10 | Découvrir un mode surprise original, conçu par l'équipe projet dans le thème espace et bonbons | un 7e mode apparaît dans la liste des modes | Could |
| BES-11 | Débloquer des skins en jouant (formes, motifs, traînées, décors), communs à tous les joueurs du téléphone, et choisir ceux à utiliser | après 100 bonbons mangés au total, la traînée « poussière d'étoiles » se débloque et peut être choisie | Should |
| BES-12 | Consulter, pour chaque mode, le tableau des 10 meilleurs scores avec nom, score et date | le tableau du mode Classique montre « Coco — 42 — 01/11/2026 » en tête | Must |
| BES-13 | Saisir son nom quand une partie entre dans le tableau des records, le dernier nom saisi étant proposé | après un record, le champ propose « Coco » ; le joueur valide ou tape un autre nom | Must |
| BES-14 | Régler séparément les bruitages, la musique et les vibrations | le joueur coupe la musique dans le métro mais garde les vibrations | Must |
| BES-15 | Sauvegarder sa progression (records, skins débloqués, réglages) dans un fichier et la restaurer sur le même téléphone ou un autre | le demandeur sauvegarde sur son S22, envoie le fichier sur son nouveau téléphone, le restaure : ses records et ses skins sont là | Must |
| BES-16 | Mettre la partie en pause et la reprendre, la pause étant automatique en cas d'interruption | un appel arrive : la partie se fige ; après l'appel, le joueur touche « Reprendre » | Must |

Cas d'erreur et cas limites :
| Besoin | Situation | Comportement attendu |
|---|---|---|
| BES-01 | Le serpent remplit presque toute l'aire de jeu et il n'y a plus de place pour un bonbon | la partie se termine sur une victoire affichée, le score est retenu |
| BES-01 | Le joueur quitte le jeu au milieu d'une partie | la partie est en pause ; aucune progression déjà acquise (records, skins) n'est perdue |
| BES-03 | Le joueur demande un demi-tour direct (aller à gauche alors que le serpent va à droite) | la commande est ignorée, le serpent ne se mord pas lui-même |
| BES-03 | Deux glissements très rapides avant le pas suivant du serpent | les deux virages sont pris dans l'ordre, sans en perdre un |
| BES-05 | Le téléphone est interrompu pendant le compte à rebours | le chrono s'arrête pendant la pause et reprend avec le temps restant |
| BES-08 | Deux effets de bonus se cumulent (ralenti puis accéléré) | le dernier effet remplace le précédent ; l'indicateur affiche l'effet en cours |
| BES-09 | Mode Zen | aucune fin de partie par collision ; l'abandon volontaire termine la partie ; le score suit les règles du tableau des records |
| BES-12 | Aucun score encore enregistré pour un mode | le tableau affiche un message « Aucun record pour l'instant » |
| BES-12 | Score égal au 10e du tableau | le score le plus ancien garde sa place ; le nouveau n'entre pas |
| BES-13 | Nom vide, trop long ou avec des caractères spéciaux et des emojis | nom vide remplacé par « Joueur » ; nom limité à 12 caractères ; accents acceptés ; le nom s'affiche toujours comme du texte, jamais interprété |
| BES-15 | Fichier de sauvegarde abîmé, modifié, d'une autre application, ou vide | restauration refusée avec un message clair ; la progression actuelle n'est pas modifiée |
| BES-15 | Restauration sur un téléphone qui a déjà une progression | les progressions sont fusionnées après confirmation : les records sont réunis et les 10 meilleurs gardés par mode, les skins débloqués sont réunis, les réglages du fichier sont appliqués |
| BES-15 | Espace de stockage insuffisant pour écrire la sauvegarde | message clair, aucune donnée du jeu perdue |
| BES-16 | Notification, appel, verrouillage de l'écran ou passage à une autre application | pause automatique immédiate ; aucun mouvement du serpent tant que le joueur n'a pas repris |

### Règles métier
| ID | Règle | Exemple conforme | Exemple non conforme et réaction attendue |
|---|---|---|---|
| RM-01 | Les bonbons ont exactement quatre couleurs : rose, violet, rose clair, bleu clair | un bonbon violet apparaît | un bonbon vert apparaît : anomalie, ne doit jamais se produire |
| RM-02 | Le serpent est rose au début de chaque partie, dans tous les modes, quel que soit le skin choisi | nouvelle partie après une partie finie en violet : le serpent repart rose | le serpent démarre violet parce que la partie précédente a fini en violet : anomalie |
| RM-03 | Le serpent prend la couleur du dernier bonbon mangé et la garde jusqu'au bonbon suivant | bonbon bleu clair, puis 20 secondes sans manger : le serpent reste bleu clair | le serpent redevient rose de lui-même : anomalie |
| RM-04 | À chaque dizaine de bonbons mangés dans la partie (10e, 20e, 30e…), le serpent devient arc-en-ciel jusqu'au bonbon suivant, qui lui redonne la couleur de ce bonbon ; l'effet est seulement visuel | 10e bonbon : arc-en-ciel ; 11e bonbon violet : violet | au 10e bonbon, le serpent gagne des points en plus ou devient invincible : anomalie |
| RM-05 | Les skins débloqués et les réglages sont communs à tous les joueurs du téléphone | Coco débloque un décor ; son ami, sur le même téléphone, peut l'utiliser | |
| RM-06 | Chaque mode a son propre tableau des 10 meilleurs scores | un score de Zen n'apparaît pas dans le tableau Classique | |
| RM-07 | Un skin ne change jamais la règle de couleur : la couleur suit toujours les bonbons | forme « comète » choisie : la comète est rose au départ, puis violette après un bonbon violet | |
| RM-08 | Un skin débloqué le reste définitivement, sauf restauration qui ne peut qu'en ajouter | | une restauration fait disparaître un skin déjà débloqué : anomalie |

### Scénarios d'usage
SCN-01 — Première partie hors ligne. Le demandeur, en mode avion, ouvre le jeu sur son S22 tenu à l'horizontale. Il choisit le mode Classique. Le serpent rose démarre ; il glisse le doigt pour le diriger, mange un bonbon violet (le serpent devient violet), puis un rose clair (rose clair). Au 10e bonbon, le serpent devient arc-en-ciel, puis bleu clair au 11e bonbon bleu clair. Il se mord la queue : fin de partie, 11 points, nouveau record. Le jeu propose de saisir un nom ; il tape « Coco » et valide. Le tableau du mode Classique affiche « Coco — 11 — 01/11/2026 ».

SCN-02 — Réglages. Dans les réglages, le demandeur passe des glissements aux flèches à l'écran, coupe la musique et garde bruitages et vibrations. Il relance une partie : les flèches s'affichent, pas de musique. Il ferme et rouvre le jeu : ses réglages sont conservés.

SCN-03 — Déblocage et choix d'un skin. Après plusieurs parties, un message annonce le déblocage d'un skin. Le demandeur ouvre la liste des skins, voit les skins débloqués et ceux encore verrouillés avec leur condition, choisit le nouveau, et lance une partie : le serpent porte ce skin, et sa couleur suit toujours les bonbons.

SCN-04 — Transfert à un nouveau téléphone. Le demandeur crée une sauvegarde : un fichier est enregistré sur son S22. Il l'envoie sur son nouveau téléphone par le moyen de son choix (câble, message, stockage en ligne personnel). Sur le nouveau téléphone, après avoir installé le jeu, il choisit « Restaurer », sélectionne le fichier et confirme : ses records, skins et réglages sont présents.

SCN-05 — Interruption. En pleine partie en mode Contre la montre, un appel arrive. Le jeu se met en pause, le chrono s'arrête. Après l'appel, le joueur revient dans le jeu, voit l'écran de pause et touche « Reprendre » : le serpent repart avec le temps restant.

SCN-06 — Partage avec un ami. Un ami possédant un iPhone récent installe le jeu en suivant le guide, avec une connexion, puis joue en mode avion.

## 5. Données
| Donnée | Origine | Format et exemple | Volume | Sensibilité (Public, Interne, Confidentiel, Sensible) | Conservation |
|---|---|---|---|---|---|
| Records | parties jouées | par mode : nom, score, date — « Coco, 42, 01/11/2026 » | 10 par mode, 7 modes au plus, soit 70 lignes | Public (pseudonymes choisis par les joueurs) | sur le téléphone, jusqu'à désinstallation ou effacement des données du jeu |
| Dernier nom saisi | joueur | texte de 12 caractères au plus — « Coco » | 1 | Public | idem |
| Skins débloqués et skins choisis | progression du jeu | liste d'identifiants de skins | quelques dizaines | Public | idem |
| Compteurs de progression | parties jouées | total de bonbons mangés, parties jouées par mode | quelques nombres | Public | idem |
| Réglages | joueur | mode de commande, bruitages, musique, vibrations | quelques valeurs | Public | idem |
| Fichier de sauvegarde | joueur, à la demande | fichier unique contenant toutes les données ci-dessus | quelques kilo-octets | Public | là où le joueur le range ; il en a la maîtrise |

Aucune donnée personnelle au-delà d'un pseudonyme librement choisi, aucune donnée envoyée sur internet, aucun compte.

Échantillons fournis : aucun.

### Cycle de vie
- Records : créés à la fin d'une partie qui entre dans le tableau ; consultés par tous les joueurs du téléphone ; jamais modifiés ; sortis du tableau quand 10 meilleurs scores les dépassent ; fusionnés à la restauration.
- Skins : verrouillés au départ, débloqués quand leur condition est remplie, puis définitivement disponibles ; choisis ou retirés à tout moment par un joueur.
- Réglages : valeurs par défaut au premier lancement (son, musique et vibrations activés ; commande par glissement), modifiés par les joueurs, conservés entre les lancements, remplacés par ceux du fichier à la restauration.
- Sauvegarde : créée à la demande, lue à la restauration ; le jeu ne la supprime jamais.

## 6. Environnement et intégrations
- Aucune intégration avec un autre service, aucun échange réseau pendant le jeu.
- Une seule connexion est acceptée au moment de l'installation ; ensuite, le jeu fonctionne toujours sans réseau.
- Appareils visés : le Samsung Galaxy S22 du demandeur (prioritaire), et tout téléphone Android ou iPhone de moins de 5 ans.
- Le transfert du fichier de sauvegarde se fait par les moyens habituels du téléphone (partage, câble, message), hors du jeu.
- Maintenance : le demandeur ; une nouvelle version s'installe comme la première, sans perdre la progression ; pas de mise à jour automatique.

### Attentes de qualité
- Fluidité : déplacement du serpent régulier et sans saccade sur le S22, réaction à une commande dès le pas suivant du serpent.
- Fiabilité : aucune perte de records, de skins ou de réglages lors d'une fermeture, d'un redémarrage ou d'une interruption.
- Prise en main : un nouveau joueur lance une partie en moins de 30 secondes après l'ouverture, sans explication ; règles de chaque mode expliquées en une ou deux phrases dans le jeu.
- Lisibilité : bonbons, serpent et obstacles bien distincts du fond spatial ; les quatre couleurs de bonbons restent distinguables entre elles ; textes lisibles à l'horizontale.
- Sobriété : démarrage du jeu en moins de 3 secondes sur le S22, aucune consommation réseau.
- Durée de vie : utilisable plusieurs années sans maintenance.

## 7. Contraintes
- Budget : nul ; 100 % gratuit, aucun abonnement, aucun achat, aucune publicité.
- Échéance : aucune.
- Langue : français uniquement.
- Diffusion : usage personnel et don gratuit à un ou deux amis ; ni vendu, ni publié dans un magasin d'applications.
- Réglementation : aucune donnée personnelle hormis un pseudonyme stocké sur le téléphone.
- Orientation : horizontale.
- Aucun service externe : toutes les fonctions sont assurées par le jeu lui-même.

## 8. Hors périmètre
- Jeu en ligne, multijoueur en réseau, classement partagé sur internet.
- Comptes, connexion, synchronisation automatique entre téléphones.
- Publicité, achats, monnaie payante.
- Publication dans un magasin d'applications.
- Langues autres que le français.
- Tenue verticale du téléphone.
- Profils de joueurs séparés (les skins et réglages sont communs au téléphone).

## 9. Hypothèses
| ID | Hypothèse | Origine (demandeur, équipe projet) | Conséquence si elle est fausse |
|---|---|---|---|
| HYP-01 | L'arc-en-ciel dure jusqu'au bonbon suivant | équipe projet, validée par le demandeur | ajuster la durée de l'effet |
| HYP-02 | À la restauration, les progressions sont fusionnées après confirmation ; un fichier abîmé est refusé sans rien modifier | équipe projet, validée par le demandeur | proposer un remplacement complet |
| HYP-03 | Pause automatique en cas d'appel, de notification, de verrouillage ou de sortie de l'application ; bouton pause disponible | équipe projet, validée par le demandeur | revoir le comportement d'interruption |
| HYP-04 | Pas de mise à jour automatique ; une nouvelle version s'installe comme la première et conserve la progression | équipe projet, validée par le demandeur | prévoir un mécanisme de mise à jour |
| HYP-05 | Les règles fines (vitesse, murs, durée des effets, détails des modes), l'apparence générale, le catalogue de skins et leurs conditions de déblocage sont décidés par l'équipe projet | demandeur | revoir les règles ou l'apparence concernées |
| HYP-06 | Bruitages, musique et vibrations activés par défaut | équipe projet, validée par le demandeur | changer les valeurs par défaut |
| HYP-07 | Les amis possèdent des téléphones de moins de 5 ans, Android ou iPhone | demandeur | adapter la compatibilité |
| HYP-32 | Le code source et l'adresse du jeu peuvent être publics une fois le projet exporté dans son propre dépôt git par le demandeur (réponse du 2026-11-01) ; d'ici là, le projet reste privé | demandeur | héberger le jeu chez un autre service gratuit, avec un accès de déploiement à protéger |
| HYP-43 | Si la restauration ne peut pas être enregistrée sur le téléphone, un message clair l'indique et la progression reste celle d'avant la restauration | équipe projet | revoir le message d'erreur |
| HYP-44 | Un skin débloqué par une partie interrompue, clôturée au lancement suivant, est annoncé à ce lancement comme tout autre déblocage | équipe projet | supprimer l'annonce différée |
| HYP-45 | Hors partie, le bouton retour du téléphone agit comme « ‹ Retour » sur les écrans secondaires ; sur le menu principal, il quitte le jeu comme toute application | équipe projet | revoir la navigation par le bouton retour |
| HYP-46 | Quitter l'écran de saisie du nom sans « Valider » garde le nom proposé déjà enregistré ; un texte tapé sans être validé n'est pas retenu | équipe projet | enregistrer aussi le texte non validé |
| HYP-47 | Le nom enregistré au record (« Joueur » s'il est vide) devient le dernier nom proposé ; le champ est vide au tout premier record | équipe projet | revoir la proposition du nom |
| HYP-48 | Si la progression ne peut pas être enregistrée sur le téléphone (espace plein, stockage refusé), un message clair le signale ; la progression reste en mémoire et l'enregistrement est retenté à l'écriture suivante | équipe projet | supprimer le message |
| HYP-49 | Une date de record dans le futur (horloge du téléphone avancée puis remise à l'heure) ne fait jamais rejeter la progression enregistrée sur le téléphone ; seul un fichier de sauvegarde importé est contrôlé strictement | équipe projet | durcir le contrôle local |
| HYP-50 | Le jeu ne remplace jamais de lui-même un fichier de sauvegarde ; si le joueur choisit lui-même, dans la fenêtre du téléphone, de remplacer un fichier existant et le confirme, le remplacement est accepté | équipe projet | refuser toute écriture dans un fichier existant |
| HYP-51 | Le nombre de bonbons mangés dans une partie n'est pas limité à la taille de l'aire de jeu (les modes Zen et Bonus et pièges permettent davantage) : il est borné à 9 999 comme le score, et jamais tronqué en silence en dessous | équipe projet | revoir la borne |

## 10. Questions ouvertes
Aucune question bloquante.

## 11. Validation
Validé par l'utilisateur le 2026-11-01 : « Valider et lancer ».

## Évolutions
Section ajoutée à chaque évolution (EVO-xx, date, nouveaux BES, validation).

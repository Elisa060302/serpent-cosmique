# Cahier de recette — Serpent Cosmique

| Version | Date | Sources |
|---|---|---|
| 1.3 | 2026-11-07 | 02 v1.5, 03, 04 (EXS-01 à EXS-20), 05, tests existants du projet |
| 1.4 | 2026-11-08 | CT-08 aligné sur la décision de l'équipe projet (aire pleine en Zen : toutes les cases occupées, corps traversable) ; noms des tests ajoutés (CT-70, 78, 83, 84) |
| 1.5 | 2026-11-09 | CT-63 et CT-91 réécrits pour se rejouer avec le seul dépôt (`git`, `grep`, `npm`) ; vocabulaire du déroulement du projet remplacé par « développement » |

## 1. Stratégie de test

### 1.1 Niveaux et responsabilités
| Niveau | Responsable | Outil | Contenu |
|---|---|---|---|
| Unitaire | équipe de développement | `node:test` (Node 22), couverture de `src/core` d'au moins 80 % | règles du moteur, des 7 modes, commandes, couleurs, ordonnanceur, records, skins, progression, validateur, fusion (03 § 9) |
| Acceptation (CT) | recette interne | Playwright 1.63.0 sur Chromium (et WebKit en CI), dossier `tests/acceptance/` ; `node:test` sur l'API du moteur pour les CT statistiques, dossier `tests/unit/` | un test par cas de test, nommé `ct_NN_…`, titre du test = identifiant du CT |
| Installation | recette interne | copie propre du dépôt du projet, environnement vierge, suivi du guide d'installation | CT d'installation propre, de mise à jour, de désinstallation |
| Sécurité fonctionnelle | recette interne | tests Playwright, ESLint, Semgrep (règles locales, via `uvx`), lecture de fichiers du dépôt | entrées malveillantes rejetées, politique de sécurité du contenu, absence de requêtes, dépendances, workflows |
| Accessibilité | recette interne | @axe-core/playwright (aucune violation sérieuse ou critique sur chaque écran), Playwright (rôles, noms accessibles, clavier, focus, mouvement réduit) et calcul des contrastes du canevas par la formule WCAG 2.2 | RGAA 4.1 et WCAG 2.2 AA selon 05 § 6 |
| Recette sur téléphone | demandeur et recette interne avec appareils | S22, iPhone sous iOS 17 ou ultérieur, procédures manuelles de ce cahier | tout ce que 03 § 9 déclare non automatisable |

Exécution : `npm run test:e2e` (Playwright) et `npm test` (moteur et acceptation moteur). Un CT se rejoue seul avec `npx playwright test -g "ct_NN_"`. Fichiers existants : `tests/acceptance/{classique,progression,socle,serveur}.spec.ts` (Playwright) et `tests/unit/*.test.ts` (moteur, règles, progression, validation, dépôt). Pour un CT non encore écrit, le fichier cité est indicatif (`modes.spec.ts`, `sauvegarde.spec.ts`, `securite.spec.ts`…) : ce qui fait foi est le nom `ct_NN_…` du test, où NN est le numéro du CT.

### 1.2 Environnement
- Poste de développement : Node 22, Chromium de Playwright (révision 1243, fournie avec Playwright 1.63.0) ; WebKit et Firefox absents, donc les CT « WebKit » sont NON EXÉCUTÉS ici et rejoués par la CI. Aucun téléphone : les CT « téléphone » sont NON EXÉCUTÉS ici, avec la raison consignée dans le rapport de tests, et sont remis au demandeur avec leur procédure.
- Le jeu est servi par `scripts/serve.mjs` sur 127.0.0.1 et un port libre ; le test démarre le serveur, attend sa réponse (délai maximal) et l'arrête dans tous les cas.
- Profils d'appareil : **S22** 780 × 360, facteur 3, tactile, 0,18 mm par pixel CSS ; **iPhone SE 3** 667 × 375, facteur 2, tactile, 0,156 mm par pixel CSS ; **16:9 de 5 pouces** 640 × 360 ; **21:9 de 6,9 pouces** 960 × 411 ; **vertical** 360 × 780. Langue fr-FR et fuseau Europe/Paris sauf mention contraire. Pour les seuils exprimés en millimètres, le test utilise la constante du jeu (1 mm = 6,3 pixels CSS : 9 mm = 57 px, 12 mm = 76 px, 5 mm = 31,5 px) et, pour les cases, la taille réelle du pixel de chaque profil.
- Horloge : `page.clock` de Playwright (temps maîtrisé, rejouable) ; date fixée au 01/11/2026 quand un CT affiche des dates.
- Aucun appel vers un service réel : toute requête vers un hôte autre que 127.0.0.1 est interceptée et refusée par le contexte de test.

### 1.3 Jeux de données (fictifs) et outils de recette
- **Fabrique de sauvegardes** (`tests/acceptance/support/sauvegarde.ts`) : construit une enveloppe valide au format de 03 § 4.1 (clés, ordre canonique, somme SHA-256), à partir de données fictives (noms comme « Coco », « Léa », « Joueur »), puis l'injecte soit par la restauration du jeu (`setInputFiles`), soit directement dans IndexedDB (base `serpent-cosmique`, magasin `kv`, clés `progress`, `progressPrevious`, `pendingGame`, 03 § 4.3) pour obtenir un état de départ.
- **Corpus de fichiers** (`tests/fixtures/saves/`) : valides (vide de progression, progression moyenne, jeu de données maximal) et piégés (EXS-04 : vide, 10 Mo, binaire, image, JSON d'une autre application, tronqué, somme fausse, version future, champ inconnu, `__proto__`, `constructor`, `prototype`, nombres hors bornes, 1 000 records, nom de 10 000 caractères, U+202E, skin et mode inconnus, date future, fichier de 262 145 octets).
- **Pilote de recette** (`tests/support/pilote.ts`, avec `tests/support/contraste.ts` pour les contrastes et `tests/acceptance/support/jeu.ts` pour le lancement et les gestes) : utilise le moteur du projet (`src/core`) comme oracle ; à partir d'une graine (`?seed=N`) il calcule les positions des bonbons et produit la suite de commandes à envoyer, à l'instant voulu de l'horloge simulée, pour atteindre un état précis (bonbon d'une couleur donnée, 10e bonbon, collision au bord, aire pleine). Il ne s'appuie sur aucun code réservé à la recette.
- **Sondes** injectées par script d'initialisation : `AudioContext`, `navigator.vibrate`, `navigator.wakeLock`, `navigator.storage.persist`, `showSaveFilePicker`, API sensibles (géolocalisation, notifications, caméra, presse-papiers…), `IDBDatabase.transaction` (échec forcé), `File.prototype.text`.
- **Lecture du canevas** : couleur et position des éléments par lecture des pixels à la position de case calculée à partir de la disposition mesurée ; texte du bandeau et des écrans par le DOM ou, pour le texte dessiné sur le canevas, par les zones vivantes d'annonce.
- **Arrêt brutal** : le navigateur est lancé avec un profil persistant temporaire et tué par signal (SIGKILL) ; c'est l'équivalent d'une fermeture forcée du téléphone.

### 1.4 Critères d'entrée et de sortie
- **Entrée** : lots de développement livrés et suite unitaire verte ; guide d'installation présent ; copie propre du dépôt construisible ; 02, 03, 04 et 05 figés.
- **Sortie** : tous les CT de priorité haute PASSÉS ; aucune anomalie BLOQUANTE ni MAJEURE ouverte ; chaque CT NON EXÉCUTÉ justifié ; couverture de code de `src/core` d'au moins 80 %. Priorités : **haute** = exigence Must, sécurité, perte de données, installation ; **moyenne** = exigence Should et mesures indicatives ; **basse** = exigence Could.
- Sévérités des anomalies : BLOQUANTE, MAJEURE, MINEURE, COSMÉTIQUE (référentiel de qualité).

### 1.5 Hypothèses du plan de test
| ID | Hypothèse | Conséquence si elle est fausse |
|---|---|---|
| HYP-38 | Les CT statistiques ou à grand nombre de pas (400 bonbons, 200 apparitions, 288 cases, 10 000 pas) s'exécutent sur l'API publique du moteur (`node:test`, dossier `tests/unit/`), les CT d'interface en Playwright ; chaque CT conserve un identifiant unique et un test nommé d'après lui | convertir ces CT en parcours Playwright plus longs |
| HYP-39 | Les états de départ s'obtiennent par restauration d'une sauvegarde fabriquée ou par écriture dans IndexedDB selon le format de 03 § 4 ; le pilote de recette utilise le moteur du projet avec une graine et l'horloge de Playwright | prévoir un moyen d'amorçage dans le produit (à éviter : 03 § 9 interdit du code réservé à la recette) |
| HYP-40 | Les mesures en millimètres automatisées utilisent la constante du jeu (6,3 px par mm) ou la taille réelle du pixel de chaque profil ; seules les mesures sur appareil font foi | tout seuil en millimètres devient « manuel » |
| HYP-41 | Les CT « téléphone » sont exécutés par le demandeur avec la recette interne sur les appareils réels ; le plan n'attend du développement que leur préparation (procédure, fiche de résultats) | accepter un verdict assorti de réserves tant qu'ils ne sont pas joués |
| HYP-42 | La mise à jour est testée entre une version 1.0.0 et une version 1.1.0 construites localement (numéro de version et contenu différents), l'adresse publiée n'existant pas avant la première publication | rejouer ces CT sur l'adresse publiée |

### 1.6 Limites connues du plan
- Safari réel sur iPhone, Samsung Internet, l'installation sur l'écran d'accueil, les vibrations, le Wake Lock réel, les appels et notifications réels, les mesures en millimètres, la perception des couleurs et la fluidité sur le S22 ne s'automatisent pas (03 § 9) : ils sont couverts par les CT « téléphone ».
- La vérification de version par le navigateur à l'ouverture connectée (R-04) n'est mesurable que sur l'adresse publiée.
- Le comportement d'un fichier de format plus ancien (RG-72) ne peut pas être testé en version 1.0.0, il n'existe qu'un format ; un fichier de test sera ajouté avec la première migration.
- La protection TLS de l'adresse publiée et les artefacts réels ne se vérifient qu'après la première publication.
- Les mesures de performance sur poste sont indicatives : seule la mesure sur téléphone fait foi.

### 1.7 Parcours de 05 couverts
| Parcours de 05 § 2 | CT |
|---|---|
| Joueur : première partie (SCN-01) | CT-24, CT-01, CT-39 |
| Joueur : interruption (SCN-05) | CT-61, CT-26, CT-62 |
| Joueur : changer la commande et le son (SCN-02) | CT-46, CT-47, CT-48 |
| Joueur : choisir un skin (SCN-03) | CT-43, CT-45 |
| Joueur : consulter les records | CT-37, CT-38 |
| Demandeur : créer une sauvegarde | CT-50, CT-51 |
| Demandeur : restaurer (SCN-04) | CT-52, CT-54, CT-55, CT-116, CT-102 |
| Demandeur : mettre à jour | CT-66, CT-67, CT-104, CT-103, CT-115 |
| Ami : installer le jeu (SCN-06) | CT-105, CT-64, CT-93, CT-94 |

### 1.8 Scénarios du besoin
| Scénario | CT |
|---|---|
| SCN-01 Première partie hors ligne | CT-24, CT-65 |
| SCN-02 Réglages | CT-46 |
| SCN-03 Déblocage et choix d'un skin | CT-43, CT-45 |
| SCN-04 Transfert à un nouveau téléphone | CT-52, CT-102 |
| SCN-05 Interruption | CT-26, CT-61, CT-96 |
| SCN-06 Partage avec un ami | CT-105, CT-94, CT-65 |

## 2. Cas de test

### CT-01 — Menu principal et lancement d'une partie en deux touchers
- **Exigences** : EF-01 (CA-1), ENF-10 (deux touchers)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_01_menu_deux_touchers` (`tests/acceptance/classique.spec.ts`) ; `ct_01_menu_principal_en_paysage` (`tests/acceptance/socle.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Ouvrir le jeu et attendre le menu principal.
  2. Relever les boutons du menu : « Jouer », « Records », « Skins », « Réglages », « Sauvegarde », dans cet ordre.
  3. Compter les touchers : toucher « Jouer », puis « Classique ».
  4. Attendre l'affichage du compte à rebours.
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : Les cinq boutons sont présents et nommés (rôle bouton) ; après exactement deux touchers le compte à rebours « 3 » s'affiche ; aucun autre écran intermédiaire.

### CT-02 — Liste des modes et règles en deux phrases
- **Exigences** : EF-01 (CA-2), ENF-10 (règles courtes), ENF-13 (français)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_02_liste_modes_regles` (`tests/acceptance/classique.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Toucher « Jouer ».
  2. Relever l'ordre des modes et le texte de la règle de chacun.
  3. Comparer chaque règle au libellé de référence de RG-03.
  4. Compter les phrases (séparateurs « . », « ! », « ? » hors guillemets) et les caractères de chaque règle.
- **Données** : Libellés de référence de RG-03.
- **Résultat attendu** : Ordre : Classique, Contre la montre, Champ d'astéroïdes, Trou noir, Bonus et pièges, Zen, « Mode mystère » ; chaque règle disponible a au plus 2 phrases et 200 caractères et reprend le sens du libellé de référence.

### CT-03 — Mode surprise verrouillé : aucune partie ne démarre
- **Exigences** : EF-01 (CA-3), EF-15 (RG-40, verrouillage)
- **Type** : erreur
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_03_mode_mystere_verrouille`, `tests/acceptance/menu.spec.ts`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; 0 partie terminée.
- **Étapes** :
  1. Ouvrir la liste des modes et toucher « Mode mystère ».
  2. Terminer une partie Zen par abandon puis revenir à la liste.
  3. Relever le message du mode mystère.
- **Données** : États de départ construits par restauration d'une sauvegarde fictive (compteurs à 0, puis 1 partie).
- **Résultat attendu** : Le toucher ne lance aucune partie ; le message « Jouez encore 3 parties pour le découvrir » s'affiche, puis « Jouez encore 2 parties pour le découvrir » après une partie. Avec 2 parties terminées, le texte devient « Jouez encore 1 partie pour le découvrir » (singulier) ; le « Mode mystère » reste focalisable et lu comme désactivé (`aria-disabled`), avec un cadenas ; le message passager apparaît au toucher.

### CT-04 — Départ de partie : serpent rose de 4 cases, compte à rebours, pas réguliers
- **Exigences** : EF-02 (CA-1, RG-04, RG-05, RG-06), RG-76 (phrase de reprise, 05 § 4.4)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_04_depart_et_pas` (`tests/acceptance/classique.spec.ts`, `tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Lancer une partie Classique, graine 1 (`?seed=1`).
  2. Relever, pendant le compte à rebours, les textes « 3 », « 2 », « 1 » et le rappel « Glissez le doigt pour diriger le serpent ».
  3. Lire les pixels du canevas : tête et anneaux, couleur, positions (colonne 6 ligne 6, anneaux en colonnes 5, 4, 3).
  4. Avancer l'horloge de 3 s puis de 167 ms en 167 ms et relever la position de la tête à chaque pas.
  5. Répéter avec le réglage « Flèches » : le rappel devient « Utilisez les flèches pour diriger le serpent ».
  6. Vérifier que le panneau du compte à rebours est opaque et lisible (contraste 4,5:1) et que le chiffre est annoncé à chaque seconde (zone vivante).
  7. Reprise après pause : relever la phrase « Reprise de la partie ».
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : Serpent rose de 4 cases au départ, tête vers la droite ; le décompte dure 3 s ; ensuite la tête avance d'une case par pas (colonne 7, 8…) ; score, bouton pause et informations de mode affichés hors de la grille.

### CT-05 — Un bonbon mangé fait grandir le serpent et augmente le score
- **Exigences** : EF-02 (CA-2, RG-07), EF-03 (RG-15)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_05_croissance_et_score` (`tests/acceptance/classique.spec.ts`, `tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Calculer avec le moteur (graine 1) le chemin vers le premier bonbon ; le jouer dans le navigateur par le pilote de recette.
  2. Relever la longueur du serpent et le score avant et après le pas où la tête entre dans la case du bonbon.
  3. Répéter jusqu'à un serpent de 7 cases, puis manger un huitième.
- **Données** : Graine 1 ; pilote de recette.
- **Résultat attendu** : Le serpent gagne un anneau (7 cases devient 8 cases au pas suivant, la queue ne bouge pas à ce pas) ; le score augmente de 1 ; un nouveau bonbon apparaît sur une case libre.

### CT-06 — Collision contre un bord : fin 1 s après
- **Exigences** : EF-02 (CA-3, RG-08), EF-16 (RG-44, raison)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_06_collision_bord_fin_1s` (`tests/acceptance/classique.spec.ts`, `tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; partie Classique en cours.
- **Étapes** :
  1. Laisser le serpent aller vers la droite jusqu'à la colonne 24.
  2. Avancer l'horloge pas à pas ; noter l'instant du pas qui sort de la grille.
  3. Mesurer le délai jusqu'à l'apparition de l'écran de fin.
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : La partie se termine par « Collision » ; le serpent reste figé à l'endroit de la collision ; l'écran de fin apparaît 1 s (± 0,2 s) après ; le score est affiché.

### CT-07 — La case que la queue quitte est libre
- **Exigences** : EF-02 (CA-4, RG-08)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_07_case_de_la_queue` (`tests/acceptance/classique.spec.ts`, `tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; partie Classique, graine fixée, bonbon éloigné.
- **Étapes** :
  1. À partir du départ, commander haut, gauche, bas : la tête se trouve alors juste derrière la queue (boucle fermée de 4 cases).
  2. Commander droite pour entrer dans la case que la queue quitte au même pas.
  3. Avancer de 10 pas supplémentaires.
- **Données** : Pilote de recette ; le cas « le serpent grandit à ce pas » (collision) est vérifié par les tests du moteur (`tests/unit/moteur.test.ts`).
- **Résultat attendu** : La partie continue sans collision ; aucun écran de fin.

### CT-08 — Victoire quand l'aire de jeu est pleine
- **Exigences** : EF-02 (CA-5, RG-09), EF-14 (RG-39, victoire), EF-16 (RG-44)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_08_victoire_aire_pleine` : `tests/unit/moteur.test.ts` pour le cas exact de 288 cases et 284 points en mode Classique ; `tests/acceptance/classique.spec.ts` pour la variante en mode Zen dans le navigateur, profil Android paysage, test lent d'environ 4,5 min)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Mode Zen : le pilote de recette joue toute la partie sur le moteur (graine 1) et envoie au navigateur, aux flèches, chaque commande juste avant son pas ; la tête et le score affichés sont contrôlés tous les 20 bonbons.
  2. Avancer l'horloge jusqu'à la dernière case libre : en Zen le corps se traverse, donc le serpent compte plus de 288 anneaux quand les 288 cases sont occupées.
  3. Variante moteur : même situation en mode Classique avec l'API du moteur (graine, 287 bonbons mangés) : le serpent mesure alors exactement 288 cases et le score est de 284.
- **Données** : Graine 1 ; horloge accélérée.
- **Résultat attendu** : La partie se termine par « Victoire ! L'aire de jeu est pleine. » ; le score est affiché et retenu dans le tableau du mode. Zen (navigateur) : les 288 cases sont occupées, le score vaut le nombre d'anneaux moins les 4 de départ (1 point par bonbon, donc plus de 284 puisque le corps se superpose). Classique (moteur) : le serpent mesure 288 cases et le score est de 284. Décision de l'équipe projet : le cas exact 288 cases / 284 points n'existe qu'en Classique.

### CT-09 — L'écran reste allumé pendant la partie
- **Exigences** : EF-02 (CA-6, RG-10)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_09_ecran_allume`, `tests/acceptance/partie.spec.ts`, sonde sur `navigator.wakeLock`) ; vérification réelle : CT téléphone
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Remplacer `navigator.wakeLock.request` par une sonde (script d'initialisation) qui compte les demandes et les libérations.
  2. Lancer une partie Zen, avancer l'horloge de 5 minutes sans toucher l'écran.
  3. Mettre en pause, puis reprendre.
  4. Refaire avec `navigator.wakeLock` absent (iPhone ancien) : le jeu ne produit aucune erreur ; la mise en veille met la partie en pause (simulée par `visibilitychange`).
- **Données** : Sonde de recette.
- **Résultat attendu** : Un verrou est demandé au début de la partie et reste actif 5 minutes ; il est relâché en pause, redemandé à la reprise ; sans API, pas d'erreur et la partie passe en pause à la perte de visibilité.

### CT-10 — Orientation horizontale et message en position verticale
- **Exigences** : EF-28 (CA-1, CA-2, RG-80, RG-81), EF-26 (RG-77, orientation verticale)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_10_orientation` (`tests/acceptance/classique.spec.ts`)) ; rotation physique à 180° : CT téléphone
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; partie en cours.
- **Étapes** :
  1. Émuler l'orientation « paysage secondaire » (protocole de débogage) et vérifier que l'affichage reste horizontal et que la commande « haut » fait monter le serpent vers le haut de l'écran.
  2. Passer le viewport en 360 × 780 (vertical).
  3. Relever le contenu visible, puis revenir à l'horizontale.
- **Données** : Profils S22 et iPhone SE.
- **Résultat attendu** : Tous les écrans restent horizontaux ; en vertical, seul « Tournez votre téléphone à l'horizontale » s'affiche, la partie est en pause (aucun pas), l'écran de pause attend « Reprendre » au retour à l'horizontale.

### CT-11 — Commande par glissement : seuil de 5 mm, une commande par contact
- **Exigences** : EF-06 (CA-1, RG-21)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_11_glissement` (`tests/acceptance/classique.spec.ts`, `tests/unit/glissement.test.ts`), événements tactiles par protocole de débogage)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; réglage « Glissement » ; partie Classique, serpent vers la droite.
- **Étapes** :
  1. Glisser vers le haut de 1 cm (63 px CSS) : relever la direction au pas suivant.
  2. Glisser lentement vers le bas par segments sans lever le doigt : relever le nombre de commandes prises pour ce contact.
  3. Glisser n'importe où sur l'écran de jeu, hors bouton pause.
- **Données** : Conversion 1 mm = 6,3 px CSS (constante de `rules.ts`).
- **Résultat attendu** : Le serpent monte au pas suivant ; la commande est prise dès 5 mm (31,5 px) sans attendre la levée du doigt ; un même contact ne produit qu'une commande.

### CT-12 — Toucher bref, glissement trop court et diagonale
- **Exigences** : EF-06 (CA-2, CA-3, RG-22)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_12_toucher_bref_et_diagonale` (`tests/acceptance/classique.spec.ts`, `tests/unit/glissement.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; réglage « Glissement ».
- **Étapes** :
  1. Toucher brièvement l'écran sans glisser.
  2. Glisser de 4 mm (25 px) vers le haut.
  3. Glisser en diagonale de 8 mm à droite et 4 mm vers le haut.
  4. Vérifier l'absence des flèches à l'écran.
- **Données** : Serpent allant vers le bas pour la diagonale.
- **Résultat attendu** : Aucune commande pour le toucher bref ni pour 4 mm ; la diagonale donne « droite » (axe dominant) ; aucune flèche affichée.

### CT-13 — Commande par flèches : taille, position, retour visuel
- **Exigences** : EF-07 (CA-1, CA-3, RG-23), ENF-07 (retour visuel en 100 ms), ENF-12 (flèches 12 mm)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_13_fleches` (`tests/acceptance/classique.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; réglage « Flèches » ; partie Classique, serpent vers le haut.
- **Étapes** :
  1. Mesurer la boîte englobante des quatre flèches (rôle bouton) sur les profils S22 et iPhone SE.
  2. Vérifier qu'aucune flèche ne recouvre le rectangle de la grille.
  3. Toucher la flèche gauche : mesurer le délai entre le toucher et le changement d'état visuel de la flèche, puis la direction au pas suivant.
- **Données** : Seuil de taille : 12 mm × 6,3 = 76 px CSS.
- **Résultat attendu** : Chaque flèche mesure au moins 76 × 76 px ; aucune ne chevauche la grille ; le retour visuel apparaît en 100 ms au plus ; le serpent tourne à gauche au pas suivant.

### CT-14 — En mode Flèches, les glissements sont ignorés
- **Exigences** : EF-07 (CA-2, RG-24), EF-06 (RG-22, flèches non affichées en glissement)
- **Type** : erreur
- **Priorité** : haute
- **Automatisé** : oui (`ct_14_fleches_ignore_glissement` (`tests/acceptance/classique.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; réglage « Flèches ».
- **Étapes** :
  1. Glisser de 2 cm dans les quatre directions sur la grille.
  2. Avancer de 5 pas.
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : La direction du serpent ne change jamais.

### CT-15 — File de commandes de 2 au plus, dans l'ordre
- **Exigences** : EF-08 (CA-1, CA-3, RG-25)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_15_file_de_commandes` (`tests/acceptance/classique.spec.ts`, `tests/unit/commandes.test.ts`), horloge arrêtée entre deux pas)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; serpent vers la droite.
- **Étapes** :
  1. Entre deux pas, glisser vers le haut puis vers la gauche ; avancer d'un pas puis d'un autre.
  2. Recommencer : entre deux pas, donner trois commandes valides successives (haut, gauche, bas) ; avancer de trois pas.
- **Données** : Horloge Playwright suspendue entre les commandes.
- **Résultat attendu** : Premier cas : le serpent monte au pas suivant puis va à gauche au pas d'après. Second cas : haut et gauche sont appliquées dans l'ordre, la troisième commande (bas) est ignorée.

### CT-16 — Demi-tour et répétition ignorés, dans tous les modes
- **Exigences** : EF-08 (CA-2, RG-26)
- **Type** : erreur
- **Priorité** : haute
- **Automatisé** : oui (`ct_16_demi_tour_ignore` (`tests/acceptance/classique.spec.ts`, `tests/unit/commandes.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; serpent vers la droite, file vide.
- **Étapes** :
  1. Commander « gauche » : le serpent doit continuer à droite.
  2. Commander « droite » trois fois : la file ne doit pas se remplir (commander ensuite haut puis gauche puis bas : seules haut et gauche sont prises).
  3. Refaire le demi-tour en mode Zen.
- **Données** : Modes Classique et Zen.
- **Résultat attendu** : Le serpent ne se mord pas ; la commande identique n'occupe pas la file ; même comportement en Zen.

### CT-17 — Commande pendant le compte à rebours et file vidée à la pause
- **Exigences** : EF-08 (RG-27), EF-25 (RG-75, file vidée)
- **Type** : limite
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_17_commande_pendant_decompte` (`tests/acceptance/classique.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Pendant le compte à rebours de départ, glisser vers le haut : relever la direction au premier pas.
  2. En cours de partie, donner une commande puis mettre en pause avant le pas suivant, reprendre, laisser passer le compte à rebours.
  3. Pendant la pause, glisser vers le haut.
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : Au départ, la commande est appliquée au premier pas ; la commande mise en file avant la pause est perdue ; aucune commande prise pendant la pause.

### CT-18 — Quatre couleurs de bonbons, tirage équilibré et placement valide (acceptation moteur)
- **Exigences** : EF-03 (CA-1, CA-2, RG-11, RG-13, RG-15)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_18_bonbons_couleurs_placement` (`tests/unit/moteur.test.ts`), `node:test` sur l'API du moteur)
- **Préconditions** : Moteur compilé ; graines 1 à 20.
- **Étapes** :
  1. Faire apparaître 400 bonbons (graine 1) et compter chaque couleur.
  2. Avec un serpent de 200 cases, faire apparaître 100 bonbons successifs ; vérifier qu'aucun n'est sur le serpent, un autre bonbon, un astéroïde ou un trou noir.
  3. Répéter le comptage sur les graines 2 à 20.
- **Données** : Jeux générés par le moteur ; aucune donnée réelle.
- **Résultat attendu** : Chaque bonbon est rose, violet, rose clair ou bleu clair ; chaque couleur apparaît entre 70 et 130 fois sur 400 ; aucun placement invalide.

### CT-19 — Le serpent prend la couleur du dernier bonbon et repart rose
- **Exigences** : EF-04 (CA-1, CA-2, CA-3, RG-16, RG-17, RG-18)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_19_couleur_du_serpent` (`tests/acceptance/classique.spec.ts`, `tests/unit/couleurs.test.ts`), lecture de pixels du canevas)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; forme « Comète » débloquée et choisie pour la troisième étape.
- **Étapes** :
  1. Chercher avec le moteur une graine dont les deux premiers bonbons sont violet puis rose clair ; jouer ce début de partie (déroulé de SCN-01) ; relever la couleur de la tête et des anneaux après chaque bonbon.
  2. En mode Zen, laisser un serpent bleu clair avancer 20 s (horloge) sans manger.
  3. Terminer une partie avec un serpent violet, choisir « Rejouer » puis, dans une autre partie, manger un bonbon violet.
- **Données** : Graine trouvée par le pilote ; sauvegarde fictive avec la Comète débloquée.
- **Résultat attendu** : Violet puis rose clair ; le bleu clair reste bleu clair 20 s ; chaque nouvelle partie démarre rose (tête et anneaux, forme Comète comprise), puis violet après un bonbon violet.

### CT-20 — Arc-en-ciel à chaque dizaine de bonbons
- **Exigences** : EF-05 (CA-1, CA-2, CA-3, RG-19, RG-20)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_20_arc_en_ciel` (`tests/acceptance/classique.spec.ts`, `tests/unit/couleurs.test.ts`, `tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Mode Classique, pilote de recette : manger 9 bonbons, puis le 10e : relever la couleur ; manger un 11e bonbon violet.
  2. Compter les couleurs distinctes lues sur le serpent arc-en-ciel (au moins 5).
  3. Refaire jusqu'au 20e bonbon (moteur).
  4. Au 10e bonbon, aller dans un bord.
- **Données** : Graine trouvée par le pilote pour que le 11e bonbon soit violet.
- **Résultat attendu** : Arc-en-ciel au 10e et au 20e bonbon (au moins 5 couleurs) ; violet au 11e ; la collision au bord termine la partie avec 10 points, sans protection ni point en plus ; vitesse et score identiques à ceux d'un serpent coloré.

### CT-21 — Silhouettes distinctes et contrastes sur les quatre décors
- **Exigences** : EF-03 (CA-3, RG-12), ENF-11 (contraste 3:1 et 4,5:1), EF-20 (RG-61)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_21_silhouettes_et_contrastes` (`tests/unit/contrastes.test.ts`)) ; identification par des personnes : CT ergonomie
- **Préconditions** : Sauvegarde fictive avec les 4 décors débloqués.
- **Étapes** :
  1. Pour chaque décor, lancer une partie de chaque type utile (Classique, Champ d'astéroïdes, Trou noir) et capturer le canevas.
  2. Calculer, avec la formule WCAG, le rapport entre la couleur de fond voisine et chaque élément : serpent rose, violet, rose clair, bleu clair, arc-en-ciel (chaque bande), chaque bonbon, astéroïde, trou noir.
  3. Calculer le rapport de chaque texte du DOM (couleur calculée contre couleur de fond).
  4. Extraire les masques d'opacité des quatre bonbons et mesurer leur écart deux à deux ; vérifier que la traînée est dessinée sous les bonbons et le serpent.
- **Données** : Calcul par formule WCAG dans le test pour le canevas ; l'analyse axe-core couvre les textes du DOM (CT de l'analyse automatique).
- **Résultat attendu** : Rapport d'au moins 3:1 pour chaque élément de jeu sur chacun des 4 décors, d'au moins 4,5:1 pour tout texte ; les quatre silhouettes ont des masques différents (écart d'au moins 15 % des pixels) ; la traînée ne cache aucun élément.

### CT-22 — Mode Classique : vitesse 6 c/s + 0,2 par bonbon, plafond 12 c/s
- **Exigences** : EF-09 (CA-1, CA-2, RG-28)
- **Type** : performance
- **Priorité** : haute
- **Automatisé** : oui (`ct_22_classique_vitesse` (`tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Mesurer l'intervalle entre deux pas à 0 bonbon, à 15 bonbons, à 45 bonbons (moteur, temps simulé ; confirmé dans le navigateur par la position de la tête relevée à chaque tranche de 10 ms d'horloge).
  2. Mesurer l'intervalle pour tous les nombres de bonbons de 0 à 60.
- **Données** : Pilote de recette ; horloge simulée.
- **Résultat attendu** : 167 ms (± 10 %) à 0, 111 ms (± 10 %) à 15, 83 ms (± 10 %) à 45 ; jamais en dessous de 83 ms.

### CT-23 — Mode Classique : collision avec la queue et écran de fin
- **Exigences** : EF-09 (CA-3), EF-16 (CA-1, RG-44)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_23_classique_collision_queue` (`tests/acceptance/classique.spec.ts`, `tests/unit/moteur.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Manger 11 bonbons (pilote), puis diriger le serpent contre sa propre queue.
  2. Relever l'écran de fin.
- **Données** : Graine 1.
- **Résultat attendu** : La partie se termine par « Collision » avec 11 points ; l'écran affiche « Classique », « Collision », « 11 » et les boutons « Rejouer » et « Menu ».

### CT-24 — Scénario SCN-01 : première partie hors ligne, record « Coco »
- **Exigences** : EF-04 (CA-1), EF-05 (CA-1), EF-16 (CA-1), EF-17 (CA-1), EF-18 (CA-1), ENF-09 (mode avion)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_24_scn01_premiere_partie` (`tests/acceptance/progression.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; jeu déjà installé puis réseau coupé (`context.setOffline(true)`) ; date fixée au 01/11/2026.
- **Étapes** :
  1. Ouvrir le jeu hors ligne ; toucher « Jouer » puis « Classique ».
  2. Jouer (pilote) : bonbon violet, bonbon rose clair, jusqu'au 10e (arc-en-ciel), 11e bleu clair, puis se mordre la queue.
  3. Sur l'écran de fin, relever « Nouveau record ! » ; taper « Coco » et valider.
  4. Ouvrir « Records », mode Classique.
- **Données** : Graine trouvée par le pilote ; date `2026-11-01`.
- **Résultat attendu** : Couleurs successives violet, rose clair, arc-en-ciel au 10e, bleu clair au 11e ; fin à 11 points ; le tableau Classique affiche « Coco — 11 — 01/11/2026 » en première ligne.

### CT-25 — Contre la montre : 60 secondes, 3 bonbons en permanence
- **Exigences** : EF-10 (CA-1, CA-4, RG-29)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_25_contre_la_montre_chrono`, `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Lancer le mode ; relever le chrono pendant le compte à rebours (il ne démarre pas) puis au premier pas.
  2. Jouer sans collision (pilote prudent) en comptant les bonbons présents sur l'aire à chaque pas.
  3. Avancer l'horloge de 60 s de jeu.
- **Données** : Graine 1 ; horloge Playwright.
- **Résultat attendu** : Le chrono démarre au premier pas, affiche des secondes entières arrondies à l'unité supérieure ; 3 bonbons toujours présents ; à 0 la partie se termine par « Temps écoulé » avec le nombre de bonbons mangés ; vitesse 8 c/s.

### CT-26 — Contre la montre : pause d'un appel, reprise, collision à 20 s
- **Exigences** : EF-10 (CA-2, CA-3, RG-30), EF-25 (CA-1), EF-26 (RG-78)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_26_contre_la_montre_pause`, `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; partie Contre la montre.
- **Étapes** :
  1. À 35 secondes restantes, simuler l'interruption (`visibilitychange` caché), avancer l'horloge de 2 minutes, revenir.
  2. Toucher « Reprendre » : relever le compte à rebours de 3 s, puis le chrono (35 s) ; laisser s'écouler 35 s de jeu.
  3. Dans une autre partie, aller dans un bord à 20 s restantes.
- **Données** : SCN-05 ; horloge Playwright.
- **Résultat attendu** : Le chrono affiche 35 à la reprise (± 0,1 s) et la partie dure encore 35 s de jeu ; la collision à 20 s donne « Collision » avec le score atteint.

### CT-27 — Champ d'astéroïdes : 3 au départ, +1 tous les 5 bonbons, 30 au plus
- **Exigences** : EF-11 (CA-1, CA-4, RG-31)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_27_asteroides_progression`, `tests/unit/asteroides.test.ts`, confirmée dans le navigateur par `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Moteur ; graine 1.
- **Étapes** :
  1. Relever le nombre d'astéroïdes au départ (aucun sur la ligne 6), après le 5e, le 20e bonbon.
  2. Amener le moteur à 30 astéroïdes, faire manger 5 bonbons de plus.
  3. Dans le navigateur, compter les astéroïdes dessinés au départ.
- **Données** : Graine 1 ; moteur piloté sans collision (mode de test du moteur).
- **Résultat attendu** : 3 astéroïdes au départ ; 7 au 20e bonbon ; jamais plus de 30 ; vitesse 7 c/s.

### CT-28 — Champ d'astéroïdes : placement valide et collision
- **Exigences** : EF-11 (CA-2, CA-3, RG-32)
- **Type** : limite
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_28_asteroides_placement_collision`, `tests/unit/asteroides.test.ts` et `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Moteur ; graines 1 à 20.
- **Étapes** :
  1. Faire apparaître 200 astéroïdes : mesurer la distance (colonnes + lignes) à la tête, vérifier la case libre.
  2. Dans le navigateur, diriger le serpent contre un astéroïde juste devant la tête.
- **Données** : Graines 1 à 20.
- **Résultat attendu** : Aucun astéroïde à moins de 4 cases de la tête, ni sur un bonbon ou le serpent ; le contact termine la partie par « Collision ».

### CT-29 — Trou noir : placement des paires, téléportation, collision à la sortie
- **Exigences** : EF-12 (CA-1, CA-2, CA-3, RG-33, RG-34)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_29_trou_noir`, `tests/unit/trou-noir.test.ts` et `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Moteur ; graines 1 à 20.
- **Étapes** :
  1. Pour 20 graines, vérifier : 4 trous, colonnes 3 à 22, lignes 3 à 10 hors ligne 6, au moins 4 cases entre deux trous, deux halos différents pour les deux paires et différents des couleurs de bonbons.
  2. Faire entrer la tête dans un trou : relever la case de sortie, la direction et le trajet des anneaux ; vérifier qu'aucune case de trou n'est occupée par le serpent.
  3. Placer un anneau sur la case de sortie du jumeau et entrer : relever la fin.
  4. Faire apparaître 200 bonbons : aucun sur un trou.
- **Données** : Graines 1 à 20.
- **Résultat attendu** : La tête ressort au même pas sur la case voisine du jumeau (colonne 19 ligne 9 pour un jumeau en colonne 18 ligne 9, direction droite) ; les anneaux suivent ; un bonbon à la sortie est mangé ; un anneau à la sortie donne « Collision » ; aucun bonbon sur un trou.

### CT-30 — Bonus et pièges : effets Inversion, Ralenti, Turbo, Rétrécissement
- **Exigences** : EF-13 (CA-1, CA-2, CA-3, RG-35, RG-36, RG-37, RG-38)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_30_bonus_effets`, `tests/acceptance/modes.spec.ts` et `tests/unit/bonus.test.ts`)
- **Préconditions** : Moteur ; graine choisie pour obtenir chaque type.
- **Étapes** :
  1. Manger un bonbon « Inversion » : glisser vers la gauche dans les 6 s, puis après 6 s.
  2. Manger un « Ralenti », puis un « Turbo » 2 s plus tard : relever vitesse, indicateur (nom, pictogramme, secondes entières arrondies).
  3. Avec un serpent de 5 cases, manger un « Rétrécissement » ; puis avec 4 cases.
  4. Vérifier score (+1), arc-en-ciel au 10e, couleur donnée par le bonbon spécial.
- **Données** : Horloge simulée.
- **Résultat attendu** : Inversion : « gauche » donne droite pendant 6 s, indicateur « Inversion » avec les secondes restantes, qui disparaît ensuite ; Turbo remplace Ralenti : 11 c/s, « Turbo », 6 s ; Rétrécissement : 5 cases deviennent 4, score +1, jamais moins de 4 cases ; vitesse de base 7 c/s.

### CT-31 — Bonus et pièges : apparition tous les 3 bonbons, disparition après 8 s de jeu
- **Exigences** : EF-13 (CA-4, RG-35)
- **Type** : limite
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_31_bonus_duree_de_vie`, `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Manger 3 bonbons : relever l'apparition d'un bonbon spécial en plus du bonbon normal.
  2. Laisser passer 8 s de jeu sans le manger ; recommencer avec une pause de 1 minute au milieu.
- **Données** : Horloge simulée.
- **Résultat attendu** : Le bonbon spécial apparaît au 3e, 6e, 9e bonbon (si aucun n'est présent) avec un pictogramme blanc ; il disparaît après 8 s de jeu ; la pause ne raccourcit pas ce délai.

### CT-32 — Mode Zen : traversée des bords et du corps, abandon et score
- **Exigences** : EF-14 (CA-1, CA-2, CA-3, RG-39), EF-25 (RG-74, abandon), EF-17 (RG-46)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_32_zen`, `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Tête en colonne 24 ligne 3 vers la droite : avancer d'un pas.
  2. Faire entrer la tête dans son propre corps.
  3. À 25 points, ouvrir la pause, « Abandonner », « Oui ».
  4. Ouvrir les tableaux Zen et Classique.
- **Données** : Pilote de recette ; vitesse 6 c/s.
- **Résultat attendu** : La tête réapparaît en colonne 1 ligne 3 ; aucune fin sur le propre corps ; « Partie abandonnée » avec 25 points proposés au tableau Zen, absents du tableau Classique.

### CT-33 — Constellation : suite de couleurs, points et bonbons permanents
- **Exigences** : EF-15 (CA-2, CA-3, CA-4, RG-41, RG-42, RG-43)
- **Type** : fonctionnel
- **Priorité** : basse
- **Automatisé** : oui (`ct_33_constellation_regles`, `tests/unit/constellation.test.ts` et `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Mode débloqué (compteurs fictifs : 3 parties).
- **Étapes** :
  1. Suite « rose, violet, bleu clair » : manger dans l'ordre rose, violet, bleu clair.
  2. Suite identique, rose déjà mangé : manger un rose clair.
  3. Compter à chaque pas les bonbons sur l'aire et leurs couleurs.
  4. Vérifier que l'arc-en-ciel compte les bonbons et non les points.
- **Données** : Graine fixée.
- **Résultat attendu** : Score 8 après la suite complète et nouvelle suite tirée ; le mauvais bonbon donne 0 point, la couleur attendue redevient rose, le serpent devient rose clair et grandit d'un anneau ; toujours 4 bonbons, un par couleur ; vitesse 7 c/s.

### CT-34 — Découverte du mode surprise à la 3e partie
- **Exigences** : EF-15 (CA-1, RG-40), EF-16 (RG-44, déblocages)
- **Type** : fonctionnel
- **Priorité** : basse
- **Automatisé** : oui (`ct_34_constellation_decouverte`, `tests/acceptance/modes.spec.ts`)
- **Préconditions** : Compteurs fictifs : 2 parties terminées.
- **Étapes** :
  1. Terminer une 3e partie (tout mode, toute fin).
  2. Relever l'écran de fin, la liste des modes, puis fermer et rouvrir le jeu.
- **Données** : Sauvegarde fictive restaurée.
- **Résultat attendu** : L'écran de fin annonce « Nouveau mode découvert : Constellation » ; le mode est en 7e position et reste disponible après réouverture.

### CT-35 — Écran de fin : raisons, Rejouer, Menu
- **Exigences** : EF-16 (CA-1, CA-2, RG-44)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_35_ecran_de_fin` (`tests/acceptance/classique.spec.ts`, `tests/acceptance/progression.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Provoquer une fin par collision, par abandon (mode Classique), par temps écoulé (Contre la montre) et par victoire (CT de victoire).
  2. Relever mode, raison, score, boutons à chaque fois.
  3. Avec un serpent violet, toucher « Rejouer » ; relever couleur, longueur, score ; refaire avec « Menu ».
  4. Vérifier la présence du rang (« 3e ») avec « Nouveau record ! » précédé d'une étoile, des lignes « Nouveau skin débloqué : <nom> » et « Nouveau mode découvert : Constellation » seulement quand un déblocage a lieu.
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : Raisons exactes « Collision », « Temps écoulé », « Victoire ! L'aire de jeu est pleine. », « Partie abandonnée » ; « Rejouer » relance le même mode avec un serpent rose de 4 cases et un score de 0 ; « Menu » ramène au menu principal. « Nouveau record ! » est accompagné d'une étoile et du rang, donc pas seulement de la couleur.

### CT-36 — Compteurs enregistrés avant l'écran de fin, même après fermeture forcée
- **Exigences** : EF-16 (CA-3, RG-45), ENF-14 (écriture avant l'écran de fin), RG-83
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_36_compteurs_durables` (`tests/acceptance/progression.spec.ts`, `tests/unit/progression.test.ts`) ; `ct_36_fermetures_forcees` (`tests/acceptance/progression.spec.ts`), arrêt brutal du navigateur par signal)
- **Préconditions** : Progression fictive : 40 bonbons au total (restauration d'une sauvegarde fictive).
- **Étapes** :
  1. Lancer une partie, manger 7 bonbons, abandonner.
  2. Dès l'apparition de l'écran de fin, lire IndexedDB : le total et le compteur du mode doivent déjà être à jour.
  3. Tuer le processus du navigateur (SIGKILL), relancer avec le même profil, ouvrir les compteurs (déblocages « Skins »).
- **Données** : Profil de navigateur persistant temporaire.
- **Résultat attendu** : À la réouverture le total vaut 47 ; le nombre de parties du mode a augmenté de 1 ; la donnée était écrite avant l'affichage de l'écran de fin.

### CT-37 — Tableaux des records : un par mode, tri, vide
- **Exigences** : EF-17 (CA-1, CA-2, RG-46, RG-47, RG-49), RG-86
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_37_tableaux_records` (`tests/acceptance/progression.spec.ts`, `tests/unit/records.test.ts`))
- **Préconditions** : Progression fictive : Classique avec 3 records dont deux à égalité de score.
- **Étapes** :
  1. Ouvrir « Records » ; choisir successivement les 7 modes.
  2. Lire rang, nom, score, date de chaque ligne du mode Classique.
  3. Terminer une partie Zen avec un score non nul et vérifier le tableau Classique.
  4. Utiliser « Mode précédent » et « Mode suivant » : le défilement boucle sur les modes disponibles et le nom du mode est annoncé.
  5. Vérifier que les rangs 1 à 5 et 6 à 10 forment une liste ordonnée lue de 1 à 10 ; qu'un nom de 12 caractères ne déborde pas.
- **Données** : Dates fictives (JJ/MM/AAAA).
- **Résultat attendu** : Un tableau par mode ; tri décroissant, à égalité le plus ancien d'abord ; un mode jamais joué affiche « Aucun record pour l'instant » ; dates au format JJ/MM/AAAA ; un score n'entre que dans le tableau de son mode. Les boutons « Mode précédent » et « Mode suivant » font défiler les modes en boucle.

### CT-38 — Entrée au tableau : égalité avec le 10e, zéro point
- **Exigences** : EF-17 (CA-3, CA-4, RG-48)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_38_entree_au_tableau` (`tests/acceptance/progression.spec.ts`, `tests/unit/progression.test.ts`, `tests/unit/records.test.ts`))
- **Préconditions** : Tableau Classique plein (10 records), 10e score = 15.
- **Étapes** :
  1. Terminer une partie Classique avec 15 points : relever l'écran de fin.
  2. Terminer avec 16 points.
  3. Terminer avec 0 point, tableau vide (autre profil).
- **Données** : Parties construites par partie interrompue fictive (états de départ) ou par le pilote.
- **Résultat attendu** : 15 points : tableau inchangé, aucun nom demandé, pas de « Nouveau record ! » ; 16 points : le score entre, l'ancien 10e sort ; 0 point : aucun record, même tableau vide.

### CT-39 — Saisie du nom : prérempli, validation, champ vide
- **Exigences** : EF-18 (CA-1, CA-2, CA-5, CA-6, RG-50, RG-53), ENF-12 (champ étiqueté), HYP-46, HYP-47
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_39_saisie_du_nom` (`tests/acceptance/progression.spec.ts`, `tests/unit/progression.test.ts`, `tests/unit/records.test.ts`))
- **Préconditions** : Progression fictive avec un record « Coco ».
- **Étapes** :
  1. Entrer au tableau : relever le champ « Votre nom » (sélecteur par étiquette) et sa valeur.
  2. Valider tel quel ; refaire en tapant « Léa » ; refaire en effaçant tout.
  3. Refaire en quittant par « Menu » sans valider.
  4. Relever le compteur « n/12 » du champ, l'absence de focus automatique, la touche « Terminé » du clavier (attribut `enterkeyhint`).
  5. Après « Valider » : relever « Nom enregistré : <nom> » et la position du focus.
  6. Champ prérempli avec « Coco » : taper « Léa », appuyer sur le bouton retour du téléphone sans « Valider » : le record est au nom de « Coco » et le record suivant propose « Coco » ; refaire en quittant par « Rejouer » et par « Menu ».
  7. Tout premier record du téléphone : le champ est vide ; valider le champ vide : le record est « Joueur » et le record suivant propose « Joueur ».
- **Données** : Noms fictifs.
- **Résultat attendu** : Le champ propose « Coco » ; « Valider » enregistre le nom saisi ; un champ vide donne « Joueur » ; quitter par « Menu » garde le nom affiché ; le nom enregistré est proposé à la partie suivante. Le compteur affiche le nombre de caractères ; au 13e caractère le message passager « 12 caractères au maximum » apparaît ; après « Valider », le bloc devient « Nom enregistré : Léa » et le focus passe sur « Rejouer ». Un texte tapé mais non validé n'est jamais retenu (retour, « Menu », « Rejouer », fermeture) ; le nom finalement enregistré, « Joueur » compris, devient le dernier nom proposé.

### CT-40 — Nom : 12 caractères, caractères spéciaux, injection
- **Exigences** : EF-18 (CA-3, RG-51, RG-52), EXS-06 (nom affiché comme texte), EXS-04 (nom importé)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_40_nom_limites_injection` (`tests/acceptance/progression.spec.ts`))
- **Préconditions** : Entrée au tableau.
- **Étapes** :
  1. Saisir « <script>Coco » puis tenter un 13e caractère.
  2. Saisir « <img src=x onerror=alert(1)> » : relever le contenu du champ et du tableau.
  3. Saisir des lettres accentuées, des chiffres, 12 emojis puis un 13e, un nom avec espaces de début et de fin, avec retour à la ligne collé.
  4. Écouter les événements `dialog` et la console pendant tout le test.
- **Données** : Noms fictifs.
- **Résultat attendu** : Le champ refuse le 13e caractère ; le tableau affiche exactement « <script>Coco » comme du texte ; « <img src=x o » est affiché littéralement (12 caractères), sans élément `img` créé ni boîte de dialogue ; un emoji compte pour 1 ; espaces de bord et retours à la ligne retirés.

### CT-41 — Record conservé si le jeu est fermé pendant la saisie du nom
- **Exigences** : EF-18 (CA-4, RG-53), RG-83
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_41_nom_fermeture_forcee` (`tests/acceptance/progression.spec.ts`))
- **Préconditions** : Progression fictive avec un record « Coco ».
- **Étapes** :
  1. Entrer au tableau ; ne pas valider ; tuer le navigateur (SIGKILL).
  2. Relancer avec le même profil, ouvrir le tableau.
- **Données** : Profil persistant temporaire.
- **Résultat attendu** : Le record figure au tableau avec le nom prérempli « Coco ».

### CT-42 — Skins au premier lancement : catalogue de 16, 4 par défaut
- **Exigences** : EF-19 (CA-2, RG-54, RG-55), EF-20 (RG-59)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_42_skins_premier_lancement` (`tests/acceptance/progression.spec.ts`, `tests/unit/progression.test.ts`, `tests/unit/skins.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Ouvrir « Skins » : relever les 16 skins par catégorie, nom, aperçu, état.
  2. Pour chaque skin verrouillé, relever la condition affichée et la progression chiffrée.
- **Données** : Table de RG-54.
- **Résultat attendu** : Seuls Anneaux, Uni, Aucune et Nuit étoilée sont débloqués et sélectionnés ; 12 skins verrouillés avec condition et progression chiffrée (par exemple « 0 / 100 bonbons »).

### CT-43 — Déblocage des skins : seuils, annonce, abandon compris
- **Exigences** : EF-19 (CA-1, CA-4, RG-56, RG-58), RG-58 (annonce différée d'une partie interrompue, HYP-44)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_43_skins_deblocage` (`tests/acceptance/progression.spec.ts`, `tests/unit/progression.test.ts`, `tests/unit/skins.test.ts`), test paramétré sur les 12 conditions de RG-54)
- **Préconditions** : Compteurs fictifs placés juste sous chaque seuil.
- **Étapes** :
  1. Pour chaque condition de RG-54, placer l'état juste sous le seuil, terminer une partie qui franchit le seuil, relever l'annonce.
  2. Total de 99 bonbons : manger 1 bonbon et terminer.
  3. Partie Classique abandonnée à 15 points.
  4. Partie à 14 points : aucun déblocage de la Comète.
- **Données** : Parties pilotées ; compteurs par restauration d'une sauvegarde fictive.
- **Résultat attendu** : « Nouveau skin débloqué : Poussière d'étoiles » à 100 bonbons ; « Comète » débloquée par un abandon à 15 points, pas à 14 ; chaque skin se débloque exactement à sa condition et est utilisable aussitôt ; « Voie lactée » après une partie terminée dans chacun des 7 modes.

### CT-44 — Un skin débloqué le reste après une restauration
- **Exigences** : EF-19 (CA-3, RG-57), EF-24 (RG-70)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_44_skin_definitif_restauration`, `tests/acceptance/skins.spec.ts`)
- **Préconditions** : Progression avec « Poussière d'étoiles » débloquée ; fichier de sauvegarde fictif qui ne la contient pas.
- **Étapes** :
  1. Restaurer le fichier et fusionner.
  2. Ouvrir « Skins ».
- **Données** : Fichier fabriqué par la fabrique de données de test (somme de contrôle recalculée).
- **Résultat attendu** : La traînée reste débloquée ; les skins du fichier sont ajoutés ; aucun skin n'est retiré.

### CT-45 — Choix et retrait d'un skin, skin verrouillé refusé
- **Exigences** : EF-20 (CA-1, CA-2, CA-3, RG-60, RG-61), EF-04 (RG-18)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_45_choix_des_skins`, `tests/acceptance/skins.spec.ts`)
- **Préconditions** : Comète et Poussière d'étoiles débloquées ; total de 63 bonbons.
- **Étapes** :
  1. Choisir la Comète, lancer une partie : relever la forme et la couleur du serpent.
  2. Toucher la Fusée verrouillée : relever sélection et textes.
  3. Choisir Poussière d'étoiles puis « Retirer » ; lancer une partie.
  4. Vérifier dans la partie que le motif n'utilise que la couleur du serpent ou du blanc.
  5. Parcourir les quatre onglets (Forme, Motif, Traînée, Décor) : un seul est actif ; relever pour chaque skin l'état écrit « Choisi » (avec coche), « Débloqué » ou « Verrouillé » (avec cadenas).
  6. Choisir un skin : relever le message passager « Skin choisi : Comète. Il sera utilisé à la prochaine partie. ».
- **Données** : Pixels du canevas.
- **Résultat attendu** : Le serpent a la forme comète et est rose au départ ; la Fusée n'est pas choisie et l'écran affiche « 250 bonbons mangés au total » et « 63 / 250 bonbons » ; « Retirer » rétablit « Aucune » dès la partie suivante ; le choix est enregistré aussitôt. Aperçus dessinés en rose de départ ; état toujours écrit en texte ; « Retirer » n'apparaît que sur un skin choisi qui n'est pas celui par défaut.

### CT-46 — Réglages : valeurs par défaut, conservation, À propos
- **Exigences** : EF-21 (CA-1, CA-2, RG-62, RG-64, RG-65), ENF-12 (état non porté par la couleur seule)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_46_reglages`, `tests/acceptance/reglages.spec.ts`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Ouvrir « Réglages » : relever commande et trois interrupteurs.
  2. Passer à « Flèches », couper la musique, lancer une partie : flèches affichées, aucune musique (sonde audio).
  3. Fermer et rouvrir le jeu (contexte persistant) ; arrêt brutal ; réouverture.
  4. Ouvrir « À propos » ; ouvrir l'écran de pause.
  5. Relever le rôle des contrôles (interrupteurs `switch`, groupe radio de la commande), l'état écrit « Activés » / « Coupée », les phrases d'aide « Le changement s'applique à la prochaine partie. » et « Avec les flèches, la grille est un peu plus petite. ».
- **Données** : Sonde audio de recette.
- **Résultat attendu** : Défauts : Glissement, bruitages, musique, vibrations activés ; après redémarrage : Flèches, musique coupée, bruitages et vibrations actifs ; « À propos » : « Serpent Cosmique », version MAJEUR.MINEUR.CORRECTIF, « © CocoClaudo », état « Prêt à jouer hors ligne » ; la pause ne propose que « Reprendre » et « Abandonner ».

### CT-47 — Vibrations indisponibles sur le téléphone
- **Exigences** : EF-21 (CA-3, RG-63)
- **Type** : erreur
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_47_vibrations_indisponibles`, `tests/acceptance/reglages.spec.ts`)
- **Préconditions** : `navigator.vibrate` supprimé (script d'initialisation, comportement iPhone).
- **Étapes** :
  1. Ouvrir les réglages.
  2. Jouer une partie jusqu'à la collision.
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : Le réglage des vibrations est grisé (désactivé) avec « Non disponible sur ce téléphone » ; aucune erreur ni exception dans la partie.

### CT-48 — Bruitages, musique et vibrations suivent leur réglage
- **Exigences** : EF-22 (CA-1, CA-2, RG-66, RG-67)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_48_sons_et_vibrations`, `tests/acceptance/reglages.spec.ts`, `AudioContext` et `navigator.vibrate` remplacés par des sondes)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Musique coupée, bruitages actifs : manger un bonbon, relever les sons déclenchés.
  2. Vibrations coupées puis actives : terminer par une collision ; relever les appels à `vibrate`.
  3. Manger un bonbon spécial (mode Bonus et pièges) : relever `vibrate(80)`.
  4. Relever les bruitages : bonbon, bonbon spécial, constellation, fin de partie, nouveau record, déblocage.
- **Données** : Sondes de recette.
- **Résultat attendu** : Un bruitage au bonbon, aucune note de musique ; `vibrate(300)` seulement si vibrations actives (collision) ; `vibrate(80)` au bonbon spécial ; chaque catégorie ne dépend que de son réglage ; l'audibilité réelle est vérifiée par le CT téléphone.

### CT-49 — Aucun son ni vibration hors du premier plan
- **Exigences** : EF-22 (CA-3, RG-66, RG-67), EF-25 (RG-75, musique arrêtée en pause)
- **Type** : limite
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_49_audio_hors_premier_plan`, `tests/acceptance/reglages.spec.ts`)
- **Préconditions** : Musique activée, menu affiché.
- **Étapes** :
  1. Simuler le passage à une autre application (`visibilitychange` caché) : relever l'état du contexte audio.
  2. Revenir dans le jeu.
  3. Lancer une partie, mettre en pause, relever la musique.
- **Données** : Sondes de recette.
- **Résultat attendu** : La musique s'arrête aussitôt au départ vers une autre application et ne reprend qu'au retour dans le jeu ; arrêtée en pause ; aucun appel à `vibrate` ni son hors premier plan.

### CT-50 — Création d'une sauvegarde : nom, message, contenu, doublon
- **Exigences** : EF-23 (CA-1, CA-3, RG-68), ENF-15 (aucun remplacement ni suppression de fichier), EXS-13 (contenu exact), ENF-10 (deux touchers)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_50_creation_sauvegarde`, `tests/acceptance/sauvegarde.spec.ts`, événement de téléchargement) ; visibilité dans le gestionnaire de fichiers : CT téléphone
- **Préconditions** : Progression fictive (records, skins, réglages).
- **Étapes** :
  1. Depuis le menu, toucher « Sauvegarde » puis « Créer une sauvegarde » (2 touchers).
  2. Relever le message et le nom du fichier téléchargé ; lire son contenu.
  3. Créer une seconde sauvegarde dans la même minute ; calculer l'empreinte du premier fichier avant et après.
  4. Sur un profil iPhone SE simulé (agent utilisateur iPhone), relever l'aide « Dans la fenêtre qui s'ouvre, choisissez « Enregistrer dans Fichiers ». » ; sur tout profil « Ne restaurez que des fichiers que vous avez créés vous-même. ».
  5. Créer 10 sauvegardes successives sans choisir d'emplacement ; calculer l'empreinte de chaque fichier après chaque création et vérifier qu'aucun fichier antérieur n'a changé ni disparu.
- **Données** : Date fixée par l'horloge Playwright.
- **Résultat attendu** : Message « Sauvegarde créée : serpent-cosmique-sauvegarde-AAAA-MM-JJ-HHMM.json » ; le second fichier porte « -2 » ; le premier est inchangé ; les clés du fichier sont exactement format, formatVersion, createdAt, data, checksum. Après 10 sauvegardes successives, les 10 fichiers existent avec des noms distincts et les premiers sont inchangés.
### CT-51 — Échec d'écriture de la sauvegarde : E-03, E-04, annulation, remplacement confirmé ou refusé
- **Exigences** : EF-23 (CA-2, CA-4, RG-69, HYP-50), ENF-15 (aucun remplacement de lui-même), ENF-16 (E-03, E-04), EXS-12 (message sans trace)
- **Type** : erreur
- **Priorité** : haute
- **Automatisé** : oui (`ct_51_sauvegarde_erreurs`, `tests/acceptance/sauvegarde.spec.ts`, sélecteur d'enregistrement simulé) ; manque de place réel : CT téléphone
- **Préconditions** : Progression fictive ; `showSaveFilePicker` remplacé par une simulation.
- **Étapes** :
  1. Simuler une écriture qui échoue avec `QuotaExceededError` : relever le message.
  2. Simuler une autre erreur d'écriture.
  3. Simuler l'annulation du choix de l'emplacement (`AbortError`).
  4. Comparer la progression (IndexedDB) avant et après chaque cas.
  5. Relever les boutons des boîtes d'erreur : « Réessayer » (E-03, E-04) ; vérifier que l'erreur reste affichée jusqu'à la prochaine action.
  6. Remplacement confirmé : le sélecteur simulé renvoie un fichier existant (contenu connu, empreinte relevée) que le joueur a choisi lui-même et pour lequel il confirme « Remplacer » ; créer une sauvegarde puis restaurer ce fichier.
  7. Remplacement refusé : le sélecteur simulé ne confirme pas le remplacement (annulation de la fenêtre) ; relever l'empreinte du fichier existant, les écritures reçues par le simulateur, les messages et la progression.
  8. Sans sélecteur (téléchargement) : créer deux fois de suite une sauvegarde dans la même minute ; vérifier que le jeu ne demande ni n'effectue aucun remplacement (noms distincts, premier fichier inchangé).
- **Données** : Simulations de recette ; fichier existant fictif dans le simulateur d'enregistrement.
- **Résultat attendu** : E-03 : « Espace de stockage insuffisant : la sauvegarde n'a pas été créée. Libérez de la place et réessayez. Votre progression est intacte. (E-03) » ; E-04 : « La sauvegarde n'a pas pu être écrite à cet endroit. Votre progression est intacte. (E-04) » ; aucun message à l'annulation ; progression strictement identique ; aucune trace technique ni sortie console. Les erreurs sont durables (boutons « Réessayer » ou « Compris »). Remplacement confirmé : le fichier choisi contient la nouvelle sauvegarde et peut être restauré (CT de restauration) ; remplacement refusé : le fichier existant est intact (même empreinte), aucune sauvegarde n'est écrite et aucun message n'apparaît ; le jeu ne remplace jamais de lui-même un fichier existant.
### CT-52 — Restauration sur un autre téléphone (SCN-04)
- **Exigences** : EF-24 (CA-1, RG-71), ENF-15 (3 s), ENF-10 (deux touchers)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_52_restauration_nominale`, `tests/acceptance/sauvegarde.spec.ts`)
- **Préconditions** : Deux contextes de navigateur vierges A et B.
- **Étapes** :
  1. Dans A, produire une progression (parties, record, skin choisi, réglage « Flèches »), créer la sauvegarde.
  2. Dans B : « Sauvegarde » puis « Restaurer » (2 touchers), choisir le fichier (`setInputFiles`).
  3. Lire le résumé (date, nombre de records, nombre de skins), toucher « Fusionner », chronométrer.
  4. Comparer records, skins débloqués et choisis, réglages, dernier nom entre A et B.
  5. Relever le texte du résumé (« Sauvegarde du JJ/MM/AAAA à HH:MM », nombre de records et de skins) et la position initiale du focus (« Annuler »).
  6. Relever la durée d'affichage du message de résultat (6 s ou fermeture par toucher).
- **Données** : Contextes A et B ; fichier produit à l'étape 1.
- **Résultat attendu** : Le résumé s'affiche avant la fusion ; « Restauration terminée : N records, M skins débloqués. » (totaux après fusion) ; progression de B identique à celle de A ; restauration en 3 s au plus. Le focus est sur « Annuler » à l'ouverture du résumé ; le message de résultat reste 6 s et est annoncé dans une zone vivante.

### CT-53 — Règles de fusion : records, compteurs, idempotence
- **Exigences** : EF-24 (CA-3, RG-70), EF-15 (RG-40, mode surprise définitif)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_53_fusion_regles`, `tests/acceptance/sauvegarde.spec.ts` et `tests/unit/fusion.test.ts`)
- **Préconditions** : 6 records Classique sur le téléphone, 7 dans le fichier dont 2 identiques (même nom, score, date et heure) ; compteurs différents.
- **Étapes** :
  1. Restaurer et fusionner.
  2. Lire le tableau Classique, les compteurs, les skins choisis, le dernier nom, les réglages.
  3. Restaurer le même fichier une seconde fois ; comparer la progression.
- **Données** : Fichiers fabriqués par la fabrique de données de test.
- **Résultat attendu** : Le tableau Classique contient les 10 meilleurs des 11 records distincts ; chaque compteur prend la plus grande des deux valeurs ; choix, réglages et dernier nom viennent du fichier ; la seconde restauration ne change rien.

### CT-54 — Restauration annulée : rien n'est modifié
- **Exigences** : EF-24 (CA-4, RG-73)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_54_restauration_annulee`, `tests/acceptance/sauvegarde.spec.ts`)
- **Préconditions** : Progression fictive ; fichier valide.
- **Étapes** :
  1. Choisir le fichier, lire le résumé, toucher « Annuler ».
  2. Comparer l'intégralité d'IndexedDB avant et après.
- **Données** : Fichier valide fabriqué.
- **Résultat attendu** : Les données sont strictement identiques.

### CT-55 — Fichiers invalides refusés : E-01 et E-02
- **Exigences** : EF-24 (CA-2, RG-72), EXS-04 (corpus piégé), EXS-12, ENF-16 (E-01, E-02)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_55_fichiers_invalides`, `tests/acceptance/securite.spec.ts`, test paramétré sur `tests/fixtures/saves/`)
- **Préconditions** : Progression fictive non vide.
- **Étapes** :
  1. Restaurer chacun des fichiers du corpus : vide ; 10 Mo ; binaire ; image ; JSON d'une autre application ; JSON tronqué ; un caractère modifié (somme fausse) ; version de format future ; champ inconnu ; clés `__proto__`, `constructor`, `prototype` ; nombres négatifs, décimaux, 1e308, NaN et null ; 1 000 records ; nom de 10 000 caractères ; nom avec U+202E ; skin inconnu ; mode inconnu ; date dans le futur ; fichier de 262 145 octets.
  2. Après chaque fichier : relever le message, la console, les requêtes réseau, et comparer IndexedDB.
- **Données** : Corpus fabriqué par la fabrique de données de test ; aucune donnée réelle.
- **Résultat attendu** : Tous refusés avec « Ce fichier n'est pas une sauvegarde valide de Serpent Cosmique. Rien n'a été modifié. (E-01) » (E-02 pour la version future) ; progression identique ; aucune trace d'exécution, aucun message console.

### CT-56 — Fusion atomique et sans pollution d'objets
- **Exigences** : EXS-05 (atomicité, pollution), EF-24 (RG-73), ENF-14 (écriture jamais incomplète)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_56_fusion_atomique`, `tests/acceptance/securite.spec.ts`)
- **Préconditions** : Progression fictive ; fichier valide ; sonde sur `IDBDatabase.transaction`.
- **Étapes** :
  1. Faire échouer la transaction d'écriture (annulation provoquée) pendant la fusion : relever le message et la progression.
  2. Arrêter brutalement le navigateur pendant la fusion, rouvrir.
  3. Importer un fichier contenant `__proto__` : lire `Object.prototype` et un objet vide de la page.
  4. Fusionner deux progressions aux skins disjoints.
- **Données** : Sonde de recette.
- **Résultat attendu** : La progression est celle d'avant l'opération dans les deux premiers cas ; `Object.prototype` inchangé ; l'union des skins est complète ; en cas d'échec le message est celui d'E-07 (voir le CT dédié), sans trace.

### CT-57 — Taille maximale du fichier importé (256 Kio) et mutations
- **Exigences** : EXS-04 (taille, mutation), RG-72
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_57_taille_et_mutations`, `tests/acceptance/securite.spec.ts`)
- **Préconditions** : Progression fictive.
- **Étapes** :
  1. Importer un fichier valide complété par des espaces jusqu'à 262 144 octets, puis un fichier de 262 145 octets, puis un fichier de 600 Ko : relever si le contenu est lu (sonde sur `File.prototype.text`).
  2. Importer 50 variantes d'un fichier valide obtenues par une mutation aléatoire reproductible (graine) d'un octet.
  3. Après chaque import, comparer la progression.
- **Données** : Mutations reproductibles par graine.
- **Résultat attendu** : 262 144 octets : contrôlé comme les autres (accepté s'il est valide) ; 262 145 octets et 600 Ko : E-01 sans lecture du contenu ; chaque mutation est refusée (E-01) sauf si elle ne change pas le sens du JSON, auquel cas la restauration est idempotente ; aucun blocage.

### CT-58 — Données maximales : fichier de 50 Ko, 2 s, 3 s
- **Exigences** : ENF-08 (volumétrie), ENF-15 (durées)
- **Type** : performance
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_58_donnees_maximales`, `tests/acceptance/sauvegarde.spec.ts`)
- **Préconditions** : Jeu de données maximal : 7 tableaux de 10 records à noms de 12 caractères (accents et emojis compris), 16 skins, compteurs à 1 000 000 000.
- **Étapes** :
  1. Charger le jeu de données maximal par restauration.
  2. Créer une sauvegarde : chronométrer, mesurer la taille du fichier.
  3. Restaurer ce fichier : chronométrer.
  4. Naviguer dans les 7 tableaux et dans l'écran Skins.
- **Données** : Jeu de données maximal fabriqué.
- **Résultat attendu** : Fichier de 50 Ko (51 200 octets) au plus ; création en 2 s au plus ; restauration en 3 s au plus ; aucun affichage dégradé ; compteurs affichés en notation française.

### CT-59 — Pause manuelle, reprise après 3 s, abandon confirmé
- **Exigences** : EF-25 (CA-1, CA-2, RG-74, RG-75, RG-76), ENF-12 (bouton pause 9 mm)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_59_pause_reprise_abandon` (`tests/acceptance/classique.spec.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; partie Classique à 9 points.
- **Étapes** :
  1. Mesurer le bouton pause (au moins 57 px) et sa présence pendant toute la partie.
  2. Toucher le bouton : relever l'écran de pause, la position de la tête et le temps ; attendre 5 s ; « Reprendre ».
  3. Relever le compte à rebours de 3 s et la position de la tête au premier pas.
  4. Pause, « Abandonner », « Non » ; puis « Abandonner », « Oui ».
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : Pause : « Pause », « Reprendre », « Abandonner » ; rien ne bouge en pause ; reprise après 3 s depuis la même position et direction ; confirmation « Abandonner la partie ? Votre score de 9 points sera conservé. » ; « Non » reste en pause ; « Oui » affiche « Partie abandonnée » avec 9 points.

### CT-60 — Bouton retour du téléphone : pause sans quitter le jeu
- **Exigences** : EF-25 (CA-3, RG-74), EF-01 (CA-4, RG-95), EF-18 (RG-53, retour sur la saisie du nom)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_60_bouton_retour` (`tests/acceptance/classique.spec.ts`), `page.goBack()`)
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1 ; partie en cours.
- **Étapes** :
  1. Déclencher le retour arrière du navigateur.
  2. Relever l'écran et l'adresse de la page.
  3. Hors partie : ouvrir « Records » depuis le menu, appuyer sur le bouton retour : le menu principal s'affiche ; recommencer pour la liste des modes, « Skins », « Réglages », « Sauvegarde » et « À propos » (retour à l'écran précédent).
  4. Sur le menu principal, appuyer de nouveau sur le bouton retour : le jeu se ferme comme toute application (la page quitte le jeu) ; rouvrir : progression intacte.
  5. Après une partie, « Menu » puis retour ; « Rejouer » puis retour : comportement conforme à RG-95 et à RG-74 (pause).
  6. Sur l'écran de saisie du nom, appuyer sur le bouton retour : RG-53 s'applique (nom prérempli conservé).
- **Données** : Profil S22 (780 × 360, facteur 3, tactile), Chromium, horloge Playwright, fuseau Europe/Paris, langue fr-FR.
- **Résultat attendu** : L'écran de pause s'affiche, la page reste ouverte, aucune partie n'est perdue. Hors partie, le retour agit comme « ‹ Retour » sur les écrans secondaires et quitte le jeu sur le menu principal sans perte de progression ; en partie, il ouvre la pause.

### CT-61 — Pause automatique : interruptions, volet, verrouillage, appel
- **Exigences** : EF-26 (CA-1, CA-2, CA-3, RG-77, RG-78), EF-28 (RG-81)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_61_pause_automatique`, `tests/acceptance/interruptions.spec.ts`) ; événements réels : CT téléphone
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Pendant la partie, déclencher successivement `visibilitychange` (caché), `pagehide`, `blur`, passage en vertical ; relever à chaque fois le nombre de pas faits après l'événement.
  2. Revenir : relever l'écran et attendre 1 minute d'horloge.
  3. Pendant le compte à rebours de départ puis de reprise, déclencher l'interruption.
  4. Mode Contre la montre : relever le chrono avant l'interruption et au retour.
- **Données** : Horloge Playwright.
- **Résultat attendu** : Aucun pas après l'événement (1 pas toléré) ; l'écran de pause attend « Reprendre » ; position identique au retour ; chrono inchangé ; une partie en compte à rebours passe aussi en pause.

### CT-62 — Partie interrompue par la fermeture du jeu
- **Exigences** : EF-27 (CA-1, CA-2, CA-3, RG-79, borne de 9 999 bonbons, HYP-51), RG-83, EF-27 (CA-4, RG-79), EF-19 (RG-58, HYP-44)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_62_partie_interrompue` (`tests/acceptance/progression.spec.ts`, `tests/unit/progression.test.ts`, `tests/unit/validation.test.ts`), arrêt brutal du navigateur)
- **Préconditions** : Progression fictive ; total de bonbons connu.
- **Étapes** :
  1. Partie Classique à 12 points, mise en pause ; arrêt brutal ; relancer.
  2. Relever le message, l'éventuelle saisie du nom, le total de bonbons, le menu.
  3. Rouvrir le jeu deux fois de suite ; compter l'enregistrement dans les compteurs.
  4. Rouvrir sans partie en cours.
  5. Toucher « Continuer » : vérifier qu'on arrive à l'écran de fin (nom à saisir) si un record a été créé, sinon au menu.
  6. Corrompre la progression (E-05) : relever la boîte avec le bouton « Compris ».
  7. Total de 95 bonbons, partie interrompue après 6 bonbons mangés : arrêt brutal, relance ; relever, après le message de partie interrompue, « Nouveau skin débloqué : Poussière d'étoiles » et le choix possible du skin.
  8. Fermer et rouvrir une seconde fois : l'annonce ne doit pas réapparaître.
  9. Partie Zen interrompue avec plus de bonbons mangés que de cases de l'aire (état de départ à 400 bonbons mangés, écrit par la fabrique d'états) : relancer et relever le total de bonbons.
  10. Mêmes vérifications avec 9 999 bonbons mangés (accepté, compté en entier) puis avec 10 000 et -1 (état refusé par le validateur : le jeu démarre normalement, rien n'est compté, aucune erreur de page).
- **Données** : Profil persistant temporaire.
- **Résultat attendu** : Message « Votre dernière partie (Classique, 12 points) a été interrompue ; elle a été enregistrée. » avant le menu, saisie du nom si 12 points entrent au tableau, total +12 ; partie enregistrée une seule fois ; sans partie en cours le menu s'affiche directement. « Continuer » mène à l'écran de fin si un record est créé, sinon au menu. Un skin débloqué par la partie clôturée est annoncé une seule fois, à ce lancement, après le message de partie interrompue. Le nombre de bonbons mangés d'une partie interrompue est enregistré tel quel de 0 à 9 999 (jamais tronqué à 288) et ajouté en entier au total ; une valeur hors de cette plage n'est jamais comptée.
### CT-63 — Installation propre depuis une copie propre du dépôt, en suivant le guide
- **Exigences** : ENF-01 (guide en 3 étapes, sans compte), ENF-18 (installation de la première version), EXS-10 (installation reproductible)
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle, preuves : commandes et sorties dans le rapport de tests ; les commandes du projet sont ensuite automatisées par la CI)
- **Préconditions** : Clone du dépôt dans un répertoire temporaire vierge ; Node 22 ; aucun autre fichier que le dépôt.
- **Étapes** :
  1. Cloner le dépôt dans un dossier temporaire vierge : `git clone <adresse ou dossier du dépôt> <dossier>`.
  2. Vérifier que le dépôt est autonome, depuis ce seul dossier : `git ls-files` ne liste que des fichiers du projet ; `git ls-files -z -- . ':!docs/projet/07-cahier-de-recette.md' | xargs -0 grep -nIE "/home/|/root/|/tmp/"` ne trouve aucun chemin absolu extérieur au dépôt ; `package.json`, `scripts/` et `.github/workflows/` ne désignent aucune dépendance ni aucun fichier hors du dépôt ; `git log --format='%an <%ae>' | sort -u` ne montre que CocoClaudo, titulaire des droits indiqué dans 01.
  3. Suivre `docs/guide-installation.md` pas à pas, sans autre source : `npm ci`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run serve`.
  4. Ouvrir l'adresse locale affichée avec un navigateur : le menu principal apparaît.
  5. Relever toute étape du guide manquante, fausse ou ambiguë.
- **Données** : Copie propre du dépôt ; environnement vierge (aucun `node_modules`, caches npm propres au test).
- **Résultat attendu** : Toutes les commandes du guide réussissent sans fichier extérieur ; compte des étapes du guide pour le joueur : 3 au plus par système ; le guide ne contient aucun `curl | sh` ; aucune référence hors du projet.

### CT-64 — Application installable et prête hors ligne (navigateur de bureau, sous-dossier compris)
- **Exigences** : ENF-01 (installation depuis le téléphone seul), ENF-02 (poids), ENF-18 (aucune expiration), EXS-08 (contexte sécurisé, ressources du site)
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : oui (`ct_64_installation_pwa`, `tests/acceptance/installation.spec.ts`)
- **Préconditions** : Construction `dist/` servie à la racine puis dans un sous-dossier (`/serpent-cosmique/`) ; contexte de navigateur vierge.
- **Étapes** :
  1. Ouvrir l'adresse ; attendre l'enregistrement de l'agent de service et l'état « Prêt à jouer hors ligne » (« À propos »).
  2. Lire le manifeste : `id`, `start_url`, `scope` valant `./`, `display` plein écran, orientation paysage, icônes 192, 512 et maskable présentes et de la bonne taille.
  3. Lister Cache Storage : toutes les ressources sont de l'origine locale, en chemins relatifs, et chaque empreinte correspond à la liste de `sw.js`.
  4. Ouvrir le jeu dans le navigateur sans l'installer : le panneau « Installer le jeu » est affiché.
  5. Servir la page sous une origine non sécurisée (nom d'hôte non local résolu vers 127.0.0.1) : relever l'enregistrement de l'agent de service.
  6. Mesurer la taille cumulée de `dist/` et `navigator.storage.estimate()` après une partie.
- **Données** : Deux constructions : racine et sous-dossier.
- **Résultat attendu** : Agent de service actif et « Prêt à jouer hors ligne » affiché ; manifeste conforme ; cache limité aux fichiers du site avec empreintes exactes ; jeu identique à la racine et en sous-dossier ; aucun enregistrement en contexte non sécurisé (le jeu reste jouable) ; `dist/` et stockage très inférieurs à 50 Mo.

### CT-65 — Fonctionnement hors ligne après redémarrage
- **Exigences** : ENF-09 (hors ligne), EXS-02 (aucune requête), RG-85
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_65_hors_ligne_apres_redemarrage`, `tests/acceptance/installation.spec.ts`) ; téléphone en mode avion : CT téléphone
- **Préconditions** : Jeu installé (voir CT précédent) dans un profil persistant.
- **Étapes** :
  1. Fermer complètement le navigateur, couper le réseau (`setOffline`), relancer avec le même profil.
  2. Jouer une partie de chaque mode jusqu'à une fin, enregistrer un nom, choisir un skin, changer un réglage, créer et restaurer une sauvegarde.
  3. Compter toutes les requêtes émises par la page et l'agent de service pendant ce parcours.
- **Données** : Interception de toute requête vers un hôte autre que 127.0.0.1 (refus).
- **Résultat attendu** : Toutes les fonctions sont disponibles ; zéro requête réseau pendant le parcours ; aucune erreur dans la console.

### CT-66 — Mise à jour proposée, jamais imposée, progression conservée (EF-29)
- **Exigences** : EF-29 (CA-1, CA-2, RG-89, RG-90), ENF-18 (progression à 100 %), EXS-16 (consentement), EXS-08 (empreintes), ENF-09 (échange admis)
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : oui (`ct_66_mise_a_jour_consentie`, `tests/acceptance/installation.spec.ts`)
- **Préconditions** : Deux constructions : version 1.0.0 installée, version 1.1.0 publiée ; progression fictive au maximum des données (ENF-08), réglages modifiés.
- **Étapes** :
  1. Ouvrir la version 1.0.0 avec la version 1.1.0 servie ; fermer puis rouvrir le jeu sans toucher « Installer » (deux fois) : relever la version affichée dans « À propos ».
  2. Ouvrir « À propos » : relever « Nouvelle version 1.1.0 disponible » et le bouton « Installer », « Votre progression est conservée. », le lien « Créer une sauvegarde » ; relever le repère « Mise à jour » sur « Réglages » du menu.
  3. Toucher « Installer » : relever l'état « Installation en cours… Ne fermez pas le jeu. » (bouton désactivé, zone vivante), le rechargement et le message « Serpent Cosmique a été mis à jour en version 1.1.0. Votre progression est conservée. ».
  4. Ouvrir « À propos » : version 1.1.0, état « Prêt à jouer hors ligne ». Couper le réseau, rouvrir, jouer.
  5. Comparer toute la progression avant et après (records, skins débloqués et choisis, compteurs, réglages, dernier nom) ; relever le manifeste (inchangé).
- **Données** : Construction 1.1.0 distincte de 1.0.0 (version et contenu différents).
- **Résultat attendu** : Sans « Installer », la version reste 1.0.0 ; après « Installer » le jeu redémarre avec le message de RG-90, « À propos » affiche 1.1.0 et la progression est identique à 100 % ; la nouvelle version fonctionne hors ligne ; l'état A de 05 affiche « Vous avez la dernière version connue. » avant publication.

### CT-67 — Mise à jour impossible : empreinte fausse ou connexion coupée (E-06)
- **Exigences** : EF-29 (CA-3, RG-91), ENF-16 (E-06), EXS-08 (vérification d'empreinte), EXS-16
- **Type** : erreur
- **Priorité** : haute
- **Automatisé** : oui (`ct_67_mise_a_jour_echec`, `tests/acceptance/installation.spec.ts`)
- **Préconditions** : Version 1.0.0 installée ; version 1.1.0 servie avec un fichier altéré, puis avec le réseau coupé en cours de téléchargement.
- **Étapes** :
  1. Toucher « Installer » avec un fichier dont l'empreinte ne correspond pas à la liste.
  2. Recommencer en coupant le réseau pendant le téléchargement.
  3. Relever le message, la version active et le fonctionnement hors ligne ensuite.
- **Données** : Fichier altéré fabriqué par le test.
- **Résultat attendu** : « La mise à jour n'a pas pu être installée. Votre version actuelle reste disponible. Réessayez avec une connexion. (E-06) » avec le bouton « Réessayer » ; la version 1.0.0 reste active et jouable en mode avion ; aucun fichier altéré n'est mis en cache ; progression intacte.

### CT-68 — Désinstallation et effacement des données
- **Exigences** : ENF-18 (conditions de validité), EXS-14 (aucune suppression par le jeu), EXS-15 (effacement documenté)
- **Type** : installation
- **Priorité** : moyenne
- **Automatisé** : oui pour l'effacement (`ct_68_effacement_des_donnees`, `tests/acceptance/installation.spec.ts`) ; désinstallation sur téléphone : CT téléphone
- **Préconditions** : Jeu installé avec une progression ; une sauvegarde créée et conservée dans le dossier de téléchargement de test.
- **Étapes** :
  1. Parcourir le jeu : aucune action de réinitialisation ni de suppression n'existe (menus, réglages, sauvegarde).
  2. Désenregistrer l'agent de service et effacer les données du site (équivalent de la procédure du guide).
  3. Rouvrir : relever l'état, puis vérifier le fichier de sauvegarde créé avant.
  4. Lire la procédure d'effacement de `docs/guide-exploitation.md` et la comparer à la réalité du téléphone (CT téléphone).
- **Données** : Fichier de sauvegarde fictif.
- **Résultat attendu** : Après effacement le jeu repart comme au premier lancement (réglages par défaut, aucun record) ; le fichier de sauvegarde n'est ni supprimé ni modifié ; le jeu n'offre aucune fonction d'effacement ; la procédure du guide est exacte.

### CT-69 — Suite d'acceptation sur WebKit et profils de téléphones
- **Exigences** : ENF-03 (compatibilité), EF-28 (iPhone), EF-21 (CA-3, vibrations absentes)
- **Type** : installation
- **Priorité** : moyenne
- **Automatisé** : oui (toute la suite sur le projet WebKit de `playwright.config.ts`, exécutée par la CI ; localement, Chromium seulement) ; appareils réels : CT téléphone
- **Préconditions** : Navigateurs de Playwright 1.63.0 ; profils « Android paysage » et « iPhone SE paysage ».
- **Étapes** :
  1. Exécuter la suite d'acceptation sur chaque profil et chaque moteur disponibles.
  2. Relever les tests ignorés pour cause d'absence d'API (vibrations, Wake Lock) et leur repli.
- **Données** : Aucune.
- **Résultat attendu** : Mêmes résultats sur Chromium et WebKit ; les replis (RG-63, RG-81, pause sans Wake Lock) fonctionnent. Localement : WebKit NON EXÉCUTÉ si le navigateur n'est pas présent, avec la raison consignée.

### CT-70 — Aucune requête réseau pendant l'exécution du jeu
- **Exigences** : EXS-02 (aucune communication), ENF-16 (aucun journal transmis), ENF-17, RG-85
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_70_aucun_reseau`, `tests/acceptance/installation.spec.ts`)
- **Préconditions** : Jeu installé ; tout hôte autre que 127.0.0.1 intercepté et refusé.
- **Étapes** :
  1. Écouter les requêtes de la page et de l'agent de service (événements `request`, `requestfailed`).
  2. Jouer une partie complète, créer une sauvegarde, en restaurer une, changer un réglage.
  3. Tenter depuis la page `fetch`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon` vers une autre origine.
  4. Redemander une ressource absente du pré-cache à l'agent de service.
- **Données** : Aucune.
- **Résultat attendu** : Aucune requête hors de l'origine locale ; les tentatives de la page sont bloquées par la politique de sécurité du contenu (violation `connect-src`) ; la ressource inconnue reçoit une réponse d'erreur sans accès réseau ; aucune requête après l'installation.

### CT-71 — Analyse statique : constructions interdites, URL absolues, secrets applicatifs
- **Exigences** : EXS-02 (règles `fetch` et URL), EXS-03 (API sensibles), EXS-05 (pas d'`Object.assign`), EXS-06 (HTML dynamique, `eval`), EXS-12 (`no-console`)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_71_analyse_statique` (`tests/unit/lint.test.ts`), exécute ESLint et Semgrep sur des fichiers d'essai) ; Semgrep via `uvx` avec les règles locales
- **Préconditions** : Copie propre du dépôt ; `npm ci` effectué.
- **Étapes** :
  1. Lancer `npm run lint` sur le projet : aucun constat.
  2. Dans un répertoire temporaire de la copie, écrire des fichiers d'essai qui contiennent chacun une construction interdite : `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, URL absolue, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `setTimeout` avec une chaîne, `Notification`, `geolocation`, `mediaDevices`, `clipboard`, `console.log`, et dans les modules de validation et de fusion `Object.assign` et la décomposition d'objet.
  3. Lancer ESLint puis Semgrep (règles de `.semgrep.yml`, sans accès au registre) sur ces fichiers.
  4. Rechercher dans `src/` toute URL absolue (`http://`, `https://`).
- **Données** : Fichiers d'essai créés puis supprimés par le test.
- **Résultat attendu** : Le projet est sans constat ; chaque fichier d'essai est signalé par au moins une règle ; aucune URL absolue dans `src/` (hors espaces de noms inertes justifiés).

### CT-72 — Politique de sécurité du contenu, cadre, cookies et indexation
- **Exigences** : EXS-07 (politique stricte, aucun cookie, refus en cadre), ENF-17
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_72_politique_de_securite` (`tests/acceptance/socle.spec.ts`))
- **Préconditions** : Construction `dist/` servie localement.
- **Étapes** :
  1. Lire la balise `<meta http-equiv="Content-Security-Policy">` de `index.html` et comparer à la valeur de 03 § 6 (EXS-07).
  2. Rechercher dans toutes les pages et feuilles de style : `<script>` ou `<style>` en ligne, attributs `on…`, `style=`.
  3. Écouter `securitypolicyviolation` pendant une partie, une sauvegarde et une restauration.
  4. Injecter depuis la page un script externe et un script en ligne : relever les violations.
  5. Afficher le jeu dans un cadre (`iframe`) : relever le démarrage.
  6. Lire `document.cookie`, les cookies du contexte, `localStorage`, la balise `referrer`, `noindex` et `robots.txt`.
- **Données** : Aucune.
- **Résultat attendu** : Politique conforme (`connect-src 'none'`, `object-src 'none'`, `base-uri 'none'`…) ; aucun script, style ou gestionnaire en ligne ; zéro violation pendant le parcours ; les injections sont bloquées ; le jeu refuse de démarrer dans un cadre ; aucun cookie ; `no-referrer`, `noindex` et `Disallow: /` présents.

### CT-73 — Aucune permission ni API sensible sollicitée
- **Exigences** : EXS-03 (moindre privilège), ENF-17 (aucune permission hors vibration et fichier)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_73_permissions`, `tests/acceptance/securite.spec.ts`) ; invites réelles : CT téléphone
- **Préconditions** : Aucune permission accordée au contexte.
- **Étapes** :
  1. Remplacer par des sondes `Notification.requestPermission`, `navigator.geolocation`, `navigator.mediaDevices`, `navigator.clipboard`, `navigator.contacts`, `navigator.bluetooth`, `navigator.usb`.
  2. Parcourir tout le jeu (modes, réglages, sauvegarde).
  3. Lire le manifeste (aucune clé de permission) et écouter les événements `dialog`.
- **Données** : Sondes de recette.
- **Résultat attendu** : Aucun appel aux sondes, aucune invite de permission, aucun dialogue ; seuls vibration, Wake Lock, sélecteur de fichiers, téléchargement ou partage et `storage.persist()` sont employés.

### CT-74 — Aucun secret dans le dépôt et son historique
- **Exigences** : EXS-01 (secrets), EXS-11 (détection en CI)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_74_aucun_secret`, `tests/acceptance/depot.spec.ts`, motifs de secrets sur tout l'historique) ; gitleaks : CI
- **Préconditions** : Copie propre du dépôt avec son historique.
- **Étapes** :
  1. Rechercher dans tous les fichiers et dans l'historique (`git log -p --all`) des motifs de secrets : clés privées, jetons GitHub, clés d'API, chaînes de connexion, `.env`.
  2. Lire `.gitignore` : `node_modules`, `dist`, `.env*`.
  3. Lire les workflows : aucun `echo` de secret ni de jeton, aucun secret stocké.
  4. Exécuter gitleaks si l'outil est disponible.
- **Données** : Motifs publics de détection.
- **Résultat attendu** : Aucune correspondance ; `.gitignore` conforme ; workflows sans secret affiché ; gitleaks NON EXÉCUTÉ si absent (tourne en CI), avec la raison dans le rapport.

### CT-75 — Dépendances : aucune à l'exécution, versions épinglées, verrou avec empreintes
- **Exigences** : EXS-10 (dépendances minimales et verrouillées)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_75_dependances`, `tests/acceptance/depot.spec.ts`)
- **Préconditions** : Copie propre du dépôt.
- **Étapes** :
  1. Lire `package.json` : aucune clé `dependencies` ; `devDependencies` sans `^` ni `~` ; `overrides` de `minimatch` ; versions identiques à celles de 03 § 11.
  2. Lire `package-lock.json` : chaque paquet porte un champ `integrity` sha512 ; aucun script d'installation (`hasInstallScript`).
  3. Lancer `npm ci` puis `npm audit` (NON EXÉCUTÉ avec la raison si le service d'avis est injoignable).
  4. Vérifier `.github/dependabot.yml` (npm et GitHub Actions) et la liste des ressources et licences du README.
  5. Vérifier qu'aucun fichier de `dist/` ne provient d'une origine tierce (polices, bibliothèques).
- **Données** : Aucune.
- **Résultat attendu** : Conformité totale ; `npm audit` sans vulnérabilité critique ou haute ; ressources toutes produites par le code ; licences compatibles avec la licence du jeu.

### CT-76 — Intégration continue et publication : droits minimaux et déclencheurs
- **Exigences** : EXS-11 (CI), EXS-16 (publication par la CI seule), EXS-08 (HTTPS, chemins relatifs)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_76_workflows`, `tests/acceptance/depot.spec.ts`) ; analyse complémentaire par `uvx zizmor` si disponible
- **Préconditions** : Copie propre du dépôt.
- **Étapes** :
  1. Lire `ci.yml` : déclencheurs push et pull request, `permissions: contents: read`, étapes (format, lint, types, tests avec couverture, construction, tests e2e, analyses).
  2. Lire `release.yml` : déclencheur par étiquette `vX.Y.Z`, droits par tâche (`pages: write` et `id-token: write` seulement pour la publication, `contents: write` pour la version).
  3. Vérifier : aucune occurrence de `pull_request_target`, toutes les actions tierces épinglées par un SHA de 40 caractères, aucun dépôt manuel vers Pages.
  4. Rejouer localement les commandes de la CI (lint, types, tests, construction, e2e).
- **Données** : Aucune.
- **Résultat attendu** : Toutes les conditions vérifiées ; les commandes de la CI réussissent localement ; zizmor sans constat de gravité haute (ou NON EXÉCUTÉ avec la raison).

### CT-77 — Artefacts d'une version : archive, SHA256SUMS, SBOM
- **Exigences** : EXS-09 (intégrité des versions), EXS-15 (lien officiel), ENF-18
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_77_artefacts_de_version`, `tests/acceptance/depot.spec.ts`, rejeu des étapes de `release.yml` en local)
- **Préconditions** : Copie propre du dépôt construite.
- **Étapes** :
  1. Rejouer les étapes du workflow de version : construire, créer `serpent-cosmique-<version>.zip`, produire `SHA256SUMS` et la SBOM CycloneDX (`npm sbom --sbom-format cyclonedx`).
  2. Vérifier `sha256sum -c SHA256SUMS`, puis altérer un octet de l'archive et recommencer.
  3. Valider la structure de la SBOM (`bomFormat`, `specVersion`, composants).
  4. Rechercher `curl | sh` dans les guides et vérifier la présence du lien officiel unique.
- **Données** : Aucune.
- **Résultat attendu** : La vérification réussit pour l'archive intacte et échoue pour l'archive altérée ; SBOM valide ; aucune commande `curl | sh` ; le guide donne un seul lien officiel.

### CT-78 — SECURITY.md et guide d'exploitation
- **Exigences** : EXS-15 (information et usage sûr), ENF-16 (codes d'erreur listés), ENF-13
- **Type** : sécurité
- **Priorité** : moyenne
- **Automatisé** : non (relecture, liste de contrôle ; une recherche de mots-clés est automatisée : `ct_78_documentation_securite`, `tests/acceptance/depot.spec.ts`)
- **Préconditions** : Copie propre du dépôt.
- **Étapes** :
  1. Vérifier dans `SECURITY.md` et `docs/guide-exploitation.md` la présence de : données stockées et emplacement, absence de communication du jeu (et vérification de version par le navigateur), effacement par plateforme, contenu lisible du fichier de sauvegarde, lien officiel unique, ne pas restaurer un fichier d'origine inconnue, ne jamais supprimer l'icône pour mettre à jour (perte des données sur iPhone), authentification à plusieurs facteurs, aucun autre site Pages sur le compte.
  2. Vérifier que `docs/guide-utilisateur.md` liste E-01 à E-08 avec leur sens.
  3. Vérifier que la documentation est en français.
- **Données** : Aucune.
- **Résultat attendu** : Tous les points sont présents et exacts ; les huit codes d'erreur sont expliqués.

### CT-79 — Chaque erreur présentée au joueur : message français, code, aucune trace (E-01 à E-08)
- **Exigences** : EXS-12 (messages génériques), ENF-16 (E-01, E-02, E-03, E-04, E-05, E-06, E-07, E-08), EF-16 (CA-4, RG-45, RG-93), ENF-14 (écran de fin conservé), ENF-13
- **Type** : erreur
- **Priorité** : haute
- **Automatisé** : oui (`ct_79_codes_d_erreur` (`tests/acceptance/progression.spec.ts`))
- **Préconditions** : Simulations de recette.
- **Étapes** :
  1. Provoquer E-01 (fichier invalide), E-02 (version future), E-03 et E-04 (écritures simulées), E-05 (IndexedDB corrompu à l'ouverture, sans version précédente lisible), E-06 (mise à jour échouée), E-07 (enregistrement de la restauration refusé), E-08 (progression non enregistrée en fin de partie).
  2. Pour E-05, corrompre `progress` seul : le jeu doit utiliser `progressPrevious` sans message ; corrompre les deux : valeurs par défaut et message.
  3. Relever, pour chaque cas, le texte exact, la console et les requêtes.
  4. E-08 : faire échouer l'écriture de la progression (transaction annulée par la sonde, ou espace plein simulé), terminer une partie : relever que l'écran de fin s'affiche normalement, avec le message non bloquant « La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08) » et qu'il disparaît de lui-même.
  5. E-08 : lever l'échec, terminer une autre partie : aucun message ; fermer et rouvrir le jeu (profil persistant) : les compteurs, le record et les déblocages comprennent les deux parties.
  6. E-08 : même vérification avec un réglage modifié et un choix de skin pendant l'échec (nouvel enregistrement complet tenté à l'écriture suivante).
- **Données** : Corruptions fabriquées par le test.
- **Résultat attendu** : Messages exacts de 02 avec leur code ; E-05 : « Votre progression n'a pas pu être lue. Vous pouvez restaurer une sauvegarde depuis le menu Sauvegarde. (E-05) » ; aucune trace d'exécution ni nom de fichier technique ; console silencieuse ; messages annoncés aux technologies d'assistance (rôle `alert`). E-08 : « La progression n'a pas pu être enregistrée sur ce téléphone. Libérez de l'espace puis rejouez : elle sera réenregistrée. (E-08) », non bloquant, jamais répété une fois l'enregistrement réussi ; après réouverture les deux parties sont comptées.

### CT-80 — Stockage privé, minimisation et persistance demandée
- **Exigences** : EXS-13 (données locales), EXS-14 (persistance, aucune suppression), ENF-14 (durabilité)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_80_donnees_locales` (`tests/acceptance/progression.spec.ts`)) ; persistance sur plusieurs jours : CT téléphone
- **Préconditions** : Jeu installé.
- **Étapes** :
  1. Jouer, enregistrer un record, créer une sauvegarde ; lister IndexedDB, `localStorage`, cookies, Cache Storage.
  2. Importer un fichier valide renommé `../../x<b>.json` : relever l'acceptation et le nom du fichier créé ensuite.
  3. Remplacer `navigator.storage.persist` par une sonde renvoyant faux : relancer le jeu 3 fois ; puis renvoyant vrai.
  4. Rechercher dans le code les API de suppression de fichiers (`removeEntry`, `FileSystem`).
- **Données** : Sondes de recette.
- **Résultat attendu** : Progression uniquement dans IndexedDB (`serpent-cosmique`) ; `localStorage` et cookies vides ; le nom du fichier importé est ignoré ; `persist()` appelé à chaque lancement tant qu'elle n'est pas accordée, jamais ensuite ; aucune API de suppression.

### CT-81 — Adresse publiée : HTTPS, certificat et artefacts réels
- **Exigences** : EXS-08 (TLS), EXS-09 (version publiée), EXS-16 (publication par la CI)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle après la première publication)
- **Préconditions** : Première version publiée par la CI ; accès réseau.
- **Étapes** :
  1. `curl -v https://<compte>.github.io/serpent-cosmique/` : protocole TLS 1.2 ou 1.3, certificat valide ; `http://` redirige vers `https://`.
  2. Si disponible, `testssl.sh` sur l'adresse.
  3. Télécharger les artefacts de la version : `sha256sum -c SHA256SUMS`.
  4. Vérifier dans l'onglet Actions que le déploiement vient de `release.yml` et que la source de Pages est « GitHub Actions ».
- **Données** : Adresse réelle du demandeur.
- **Résultat attendu** : TLS 1.2 au moins avec certificat valide, redirection HTTP vers HTTPS, aucun contenu mixte ; empreintes concordantes ; publication issue de la CI.

### CT-82 — Grille entièrement visible, cases et zones sûres sur la gamme d'écrans
- **Exigences** : ENF-04 (affichage), EF-07 (CA-3), EF-28 (RG-80), EF-07 (RG-23), 05 § 4.3 (tailles de case)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_82_grille_entiere_et_cases` (`tests/acceptance/classique.spec.ts`, `tests/unit/disposition.test.ts`) ; `ct_82_marges` (`tests/unit/disposition.test.ts`)) ; mesures sur appareils : CT téléphone
- **Préconditions** : Profils : S22 (780 × 360, 0,18 mm par pixel CSS), iPhone SE 3 (667 × 375, 0,156 mm), 16:9 de 5 pouces (640 × 360), 21:9 de 6,9 pouces (960 × 411) ; zones sûres simulées (haut 0, côtés 44 px, bas 21 px) si le protocole de débogage le permet.
- **Étapes** :
  1. Pour chaque profil, chaque orientation horizontale et chaque commande (« Glissement », « Flèches »), lancer une partie.
  2. Mesurer la boîte du canevas de la grille, la taille d'une case, les boîtes de la barre d'informations, du bouton pause et des flèches.
  3. Convertir la taille des cases en millimètres avec la taille réelle du pixel CSS du profil.
  4. Vérifier qu'aucun élément ne sort de la zone sûre.
  5. Comparer aux tailles de case annoncées par 05 § 4.3 : S22 24 px (« Glissement » et « Flèches »), iPhone SE 3 25 px (« Glissement ») et 21 px (« Flèches ») ; vérifier qu'aucune case ne mesure moins de 19 px et que les flèches gardent 76 px.
  6. Vérifier que les flèches sont en deux colonnes (Haut au-dessus de Bas à gauche ; Gauche au-dessus de Droite à droite) avec leur nom écrit.
- **Données** : Tailles de pixel de la colonne ci-dessus.
- **Résultat attendu** : Grille 24 × 12 entièrement visible ; cases d'au moins 4 mm (S22) et d'au moins 3 mm (autres profils) ; aucun bouton, texte ou case dans les zones de l'encoche et des coins ; aucune flèche sur la grille. Les cases mesurent au moins les valeurs de 05 § 4.3 (24, 24, 25 et 21 px), jamais moins de 19 px ; disposition des flèches conforme à 05 § 4.3.

### CT-83 — Temps de démarrage et de navigation (mesure indicative sur poste)
- **Exigences** : ENF-05 (démarrage, lancement de partie, changement d'écran)
- **Type** : performance
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_83_temps_de_navigation` (`tests/acceptance/classique.spec.ts` : changement d'écran et lancement ; `tests/acceptance/qualite.spec.ts` : démarrage, cinq mesures), ralentissement du processeur par un facteur 4) ; mesure officielle : CT téléphone
- **Préconditions** : Cache de l'agent de service chaud ; profil S22.
- **Étapes** :
  1. Mesurer 5 fois le délai entre le début du chargement et l'apparition du menu utilisable.
  2. Mesurer le délai entre le toucher d'un mode et l'affichage du compte à rebours.
  3. Mesurer le délai entre le toucher d'un bouton du menu et l'affichage de l'écran suivant.
- **Données** : Aucune.
- **Résultat attendu** : La valeur la plus lente respecte 3 s (démarrage), 1 s (lancement d'une partie), 0,5 s (changement d'écran) ; l'écart avec le téléphone est consigné.

### CT-84 — Régularité des pas et fluidité d'affichage (mesure indicative sur poste)
- **Exigences** : ENF-06 (intervalles à ± 10 %, 50 images par seconde), ENF-08 (serpent de 280 cases)
- **Type** : performance
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_84_regularite_des_pas` (`tests/unit/ordonnanceur.test.ts`, à 60 Hz et 120 Hz simulés) ; la mesure indicative dans le navigateur : `ct_84_regularite_des_pas`, `tests/acceptance/qualite.spec.ts`) ; mesure officielle : CT téléphone
- **Préconditions** : Chromium, horloge réelle ; mode Zen.
- **Étapes** :
  1. Relever pendant 30 s le nombre d'images par seconde (`requestAnimationFrame`).
  2. Relever les instants des pas par détection du changement de case de la tête (lecture de pixels à chaque image).
  3. Moteur : vérifier à 60 Hz et 120 Hz simulés que 95 % des intervalles sont à ± 10 % de l'intervalle nominal à 12 c/s et qu'aucun ne dépasse le double ; avec un serpent de 280 cases.
- **Données** : Aucune.
- **Résultat attendu** : Au moins 50 images par seconde en moyenne sur le poste ; 95 % des intervalles dans la tolérance, aucun supérieur au double ; aucun pas rattrapé après une reprise.

### CT-85 — Réactivité des commandes
- **Exigences** : ENF-07 (commande appliquée au pas, retour visuel 100 ms)
- **Type** : performance
- **Priorité** : haute
- **Automatisé** : oui (`ct_85_reactivite`, `tests/acceptance/commandes.spec.ts`) ; capture vidéo : CT téléphone
- **Préconditions** : Modes « Glissement » et « Flèches ».
- **Étapes** :
  1. Envoyer 20 commandes chacune juste avant un pas (horloge Playwright) : relever la direction prise à ce pas.
  2. Relever le délai du retour visuel de chaque flèche touchée.
- **Données** : Aucune.
- **Résultat attendu** : Les 20 commandes sont appliquées au pas qui suit (dans la limite de la file) ; retour visuel en 100 ms au plus.

### CT-86 — 20 arrêts brutaux : aucune perte, écriture jamais incomplète
- **Exigences** : ENF-14 (conservation), RG-83
- **Type** : fiabilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_86_vingt_arrets_brutaux`, `tests/acceptance/securite.spec.ts`, signal SIGKILL sur le processus du navigateur)
- **Préconditions** : Profil persistant temporaire ; progression fictive.
- **Étapes** :
  1. Répéter 20 fois : modifier une donnée (réglage, choix de skin, nom de record, fin de partie, bonbon mangé en partie), attendre 1 s, tuer le navigateur, relancer.
  2. Une fois sur deux, tuer au moment même de l'action (moins d'1 s).
  3. Après chaque relance, valider la progression lue et comparer à l'attendu.
- **Données** : Aucune.
- **Résultat attendu** : Toute donnée enregistrée plus de 1 s avant l'arrêt est retrouvée ; après un arrêt immédiat, l'état est celui d'avant ou d'après, jamais partiel ; E-05 n'apparaît jamais.

### CT-87 — Textes en français, dates et nombres au format français
- **Exigences** : ENF-13 (langue et formats), RG-86
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_87_langue_et_formats`, `tests/acceptance/qualite.spec.ts`) ; relecture exhaustive manuelle en complément
- **Préconditions** : Contextes avec la langue `en-US` et le fuseau `America/New_York`, puis `fr-FR` et `Europe/Paris`.
- **Étapes** :
  1. Parcourir tous les écrans (menu, modes, partie, pause, fin, records, skins, réglages, sauvegarde, à propos, messages d'erreur, panneau d'installation) et extraire tous les textes visibles et les noms accessibles.
  2. Rechercher dans ces textes des mots anglais usuels (liste d'exclusion fournie).
  3. Avec des compteurs et scores supérieurs à 1 000, relever les nombres affichés ; relever les dates des records.
- **Données** : Compteurs fictifs (1 234 bonbons, 12 345).
- **Résultat attendu** : 100 % des textes en français ; dates JJ/MM/AAAA à l'heure locale du téléphone ; milliers séparés par une espace (insécable ou fine) ; résultats identiques quel que soit le réglage de langue du navigateur.

### CT-88 — Zones tactiles, tailles de texte, clignotements, jeu complet aux flèches
- **Exigences** : ENF-12 (accessibilité), EF-05 (RG-20), EF-07
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_88_zones_tactiles_clignotements`, `tests/acceptance/accessibilite.spec.ts`) ; mesures en millimètres : CT téléphone
- **Préconditions** : Profil S22 ; décor par défaut.
- **Étapes** :
  1. Mesurer toutes les zones tactiles du menu, des écrans et de la partie : au moins 57 px (9 mm) ; flèches au moins 76 px (12 mm).
  2. Relever la taille de police calculée de chaque texte (hauteur de majuscules d'au moins 1,8 mm, soit une police d'au moins 16 px).
  3. Pendant un arc-en-ciel, un effet Turbo, un indicateur d'effet et le décompte, échantillonner chaque zone toutes les 33 ms pendant 5 s et compter les changements de couleur par seconde.
  4. Jouer une partie complète en mode « Flèches » sans aucun glissement.
- **Données** : Conversion 1 mm = 6,3 px CSS.
- **Résultat attendu** : Toutes les cibles respectent les tailles ; aucun élément ne change de couleur plus de 3 fois par seconde ; la partie se joue entièrement aux flèches.

### CT-89 — Endurance automatisée : pauses, sauvegardes et parties enchaînées
- **Exigences** : ENF-20 (fiabilité)
- **Type** : fiabilité
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_89_endurance_automatisee`, `tests/acceptance/qualite.spec.ts`) ; 2 heures de jeu réelles : CT téléphone
- **Préconditions** : Horloge accélérée.
- **Étapes** :
  1. Enchaîner 50 cycles pause/reprise, 20 sauvegardes puis restaurations et une partie de chaque mode.
  2. Relever les erreurs de page (`pageerror`), les plantages (`crash`), les messages de console et l'évolution de la mémoire du processus.
- **Données** : Pilote de recette.
- **Résultat attendu** : Aucun blocage ni plantage ; aucune erreur de page ; croissance de la mémoire bornée (moins de 50 %).

### CT-90 — Aléa reproductible et valeurs des règles à un seul endroit
- **Exigences** : ENF-19 (règles centralisées, aléa reproductible)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_90_graine_et_regles` (`tests/unit/random.test.ts`, `tests/unit/rules.test.ts`))
- **Préconditions** : Copie de travail temporaire du projet pour la mutation.
- **Étapes** :
  1. Jouer deux fois la même partie (même `?seed=`, mêmes commandes) : comparer les positions des bonbons et des obstacles (pixels) ; recommencer avec une autre graine.
  2. Passer des graines invalides (`?seed=abc`, négative, très grande) : relever le comportement.
  3. Sur la copie : modifier dans `src/core/rules.ts` la vitesse de départ du mode Classique et le nombre d'astéroïdes de départ, reconstruire, vérifier que le jeu suit.
  4. Rechercher dans `src/` hors `rules.ts` les valeurs de règles recopiées (24, 12, 167, 60, 6,3, 288).
- **Données** : Graines 1 à 5.
- **Résultat attendu** : Même graine et mêmes commandes donnent les mêmes positions ; graines différentes, positions différentes ; graine invalide ignorée sans erreur ; les deux modifications se répercutent sans autre changement ; aucune valeur de règle dupliquée hors de `rules.ts`.

### CT-91 — Guides et documentation : exactitude et complétude
- **Exigences** : ENF-01 (guide en 3 étapes), ENF-13 (français), EXS-15
- **Type** : installation
- **Priorité** : moyenne
- **Automatisé** : non (relecture guidée par une liste de contrôle ; vérification de l'absence de mentions étrangères au produit par recherche textuelle)
- **Préconditions** : Copie propre du dépôt.
- **Étapes** :
  1. Lire `docs/guide-installation.md` : étapes Android et iPhone, chacune de 3 étapes au plus, depuis le téléphone seul, sans compte payant.
  2. Lire `docs/guide-utilisateur.md` : modes, commandes, skins, réglages, sauvegarde, codes d'erreur.
  3. Vérifier que `README.md`, `CHANGELOG.md`, `LICENSE` désignent le titulaire des droits de l'expression du besoin.
  4. Rechercher les marqueurs de travail restants dans le code et les guides : `grep -rnIE "TODO|FIXME|À COMPLÉTER" src public scripts README.md CHANGELOG.md SECURITY.md docs/guide-installation.md docs/guide-utilisateur.md docs/guide-exploitation.md` ne doit rien trouver.
- **Données** : Aucune.
- **Résultat attendu** : Guides complets, exacts, en français ; titulaire « CocoClaudo » ; aucun marqueur de travail restant.

### CT-92 — Écrans en DOM : parcours au clavier, focus visible, noms accessibles
- **Exigences** : ENF-12 (accessibilité), ENF-11 (texte), EF-01 (RG-01), EF-18 (RG-50)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_92_parcours_clavier`, `tests/acceptance/accessibilite.spec.ts`)
- **Préconditions** : Profil S22 avec clavier.
- **Étapes** :
  1. Vérifier `lang="fr"`, un titre de page et un titre principal par écran.
  2. Parcourir chaque écran du menu avec Tab, Maj+Tab, Entrée, Espace et Échap : ordre logique, aucun piège, tout bouton atteignable.
  3. Vérifier un contour de focus visible (contraste d'au moins 3:1) sur chaque élément focalisable.
  4. Sélectionner chaque contrôle par son rôle et son nom accessible (`getByRole`) : boutons du menu, interrupteurs des réglages, champ « Votre nom » (`getByLabel`), boutons « Valider », « Reprendre », « Abandonner », « Oui », « Non ».
  5. Provoquer une erreur (E-01) : vérifier que le message est annoncé (`role="alert"` ou région dynamique) et relié au contrôle concerné.
  6. Contrôler que l'état des interrupteurs et des skins choisis et verrouillés est exposé (attributs `aria-pressed`, `aria-checked` ou `disabled`).
- **Données** : Aucune.
- **Résultat attendu** : Tous les écrans sont utilisables au clavier ; focus toujours visible ; noms accessibles présents pour tous les contrôles ; langue déclarée ; messages d'erreur annoncés et reliés ; la commande du serpent au clavier est hors périmètre (02 § 6).

### CT-93 — Installation sur Android (Samsung Galaxy S22), chronométrée
- **Exigences** : ENF-01 (3 étapes, 10 minutes, 0 €), ENF-03 (S22 à jour), ENF-02 (espace occupé), EXS-03 (aucune permission demandée), ENF-17
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur téléphone)
- **Préconditions** : S22 à jour, Chrome préinstallé, une connexion Wi-Fi, aucun mode développeur, copie du guide d'installation ; personne n'ayant pas participé au projet si possible.
- **Étapes** :
  1. Chronomètre en main, suivre uniquement `docs/guide-installation.md` : lien officiel, « Installer », ouverture depuis l'icône, attente de « Prêt à jouer hors ligne ».
  2. Compter les étapes, les écrans de permission, les comptes demandés.
  3. Relever dans Paramètres > Applications l'espace occupé par le jeu.
  4. Activer le mode avion et jouer une partie.
- **Données** : Aucune.
- **Résultat attendu** : 10 minutes au plus ; 3 étapes au plus ; aucune permission, aucun compte, aucun mode développeur ; icône présente ; espace occupé inférieur à 50 Mo ; le jeu fonctionne en mode avion.

### CT-94 — Installation sur iPhone (Safari, iOS 17 ou ultérieur), chronométrée
- **Exigences** : ENF-01 (iPhone), ENF-03 (iPhone SE 3 et suivants), ENF-02, EF-21 (CA-3), EF-28 (CA-2), EF-02 (CA-6, limite iOS < 18.4)
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur téléphone)
- **Préconditions** : iPhone sous iOS 17 ou ultérieur (idéalement 17.x et 18.4 ou plus), connexion Wi-Fi, guide d'installation.
- **Étapes** :
  1. Suivre le guide : lien dans Safari, Partager > « Sur l'écran d'accueil » > « Ajouter », ouverture depuis l'icône, attente de « Prêt à jouer hors ligne ».
  2. Passer en mode avion, fermer l'application, la rouvrir, jouer.
  3. Ouvrir les réglages : vibrations grisées avec « Non disponible sur ce téléphone ».
  4. Tenir le téléphone vertical : message « Tournez votre téléphone à l'horizontale » et partie en pause.
  5. Mode Zen sans toucher l'écran jusqu'à la mise en veille (iOS avant 18.4) : la partie doit passer en pause sans perte.
- **Données** : Aucune.
- **Résultat attendu** : Installation en 10 minutes au plus et 3 étapes au plus ; le jeu fonctionne hors ligne ; repli des vibrations, de l'orientation et de la veille conformes à 03 § 5.2 ; limites iPhone conformes à HYP-31.

### CT-95 — Mode avion, redémarrage et 7 jours sans échange
- **Exigences** : ENF-09 (0 octet en mode avion), EXS-02, RG-85, EXS-14 (persistance)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur téléphone)
- **Préconditions** : Jeu installé sur S22 et iPhone ; compteur de données par application relevé au départ.
- **Étapes** :
  1. Activer le mode avion, redémarrer le téléphone, rouvrir le jeu.
  2. Jouer chaque mode, créer et restaurer une sauvegarde, changer les réglages et les skins.
  3. Utiliser le jeu pendant 7 jours (connexion rétablie hors des tests) ; relever la consommation de données de l'application et inspecter l'ouverture connectée (volume de la vérification de version).
  4. Après plusieurs jours sans usage, rouvrir : progression présente.
- **Données** : Aucune.
- **Résultat attendu** : Toutes les fonctions disponibles en mode avion après redémarrage ; 0 octet en mode avion ; vérification de version de 10 Ko au plus par ouverture connectée, sans donnée du joueur ; progression conservée.

### CT-96 — Interruptions réelles, rotation, veille
- **Exigences** : EF-26 (CA-1, CA-2, CA-3), EF-28 (CA-1), EF-02 (CA-6), EF-25 (CA-3), EF-27
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur S22 et iPhone)
- **Préconditions** : Deux téléphones ou une ligne d'appel de test ; délai de veille réglé à 30 secondes.
- **Étapes** :
  1. Recevoir un appel pendant une partie, raccrocher, revenir.
  2. Ouvrir le volet de notifications ; toucher une notification ; changer d'application ; verrouiller l'écran 1 minute.
  3. Mode Zen sans toucher l'écran pendant 5 minutes.
  4. Retourner le téléphone de 180° en partie ; appuyer sur le bouton retour d'Android ; fermer l'application depuis la liste des applications récentes en pleine partie, rouvrir.
- **Données** : Aucune.
- **Résultat attendu** : À chaque interruption la partie est en pause sans mouvement du serpent (1 pas toléré) et attend « Reprendre » ; l'écran reste allumé 5 minutes (S22) ; l'affichage se retourne et « haut » monte toujours vers le haut de l'écran ; le retour met en pause ; la fermeture forcée donne le message de partie interrompue.

### CT-97 — Mesures physiques : cases, zones tactiles, texte, seuil de glissement
- **Exigences** : ENF-04, ENF-12, EF-06 (5 mm), EF-07 (12 mm), EF-25 (9 mm)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle, mesures à la règle sur l'écran ou sur captures calibrées)
- **Préconditions** : S22 et le plus petit téléphone disponible (idéalement iPhone SE 3) ; règle graduée.
- **Étapes** :
  1. Mesurer le côté d'une case en modes « Glissement » et « Flèches » dans les deux sens horizontaux.
  2. Mesurer les flèches, le bouton pause, les boutons du menu, la hauteur des majuscules du texte courant.
  3. Glisser lentement et relever à quelle distance la commande est prise.
  4. Vérifier que l'encoche, la caméra et les coins arrondis ne cachent rien.
- **Données** : Aucune.
- **Résultat attendu** : Cases d'au moins 4 mm (S22) et 3 mm (autre) ; flèches de 12 mm, pause et boutons de 9 mm au moins ; majuscules de 1,8 mm au moins ; seuil de glissement perçu proche de 5 mm ; rien de caché.

### CT-98 — Performance sur S22 : démarrage, fluidité, réactivité, serpent de 280 cases
- **Exigences** : ENF-05 (S22 : 3 s, 1 s, 0,5 s), ENF-06 (5 minutes à 12 c/s), ENF-07 (20 commandes), ENF-08 (280 cases)
- **Type** : performance
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle, caméra à haute fréquence)
- **Préconditions** : S22 redémarré ; caméra capable de 240 images par seconde ; partie de recette avec graine.
- **Étapes** :
  1. 5 essais de démarrage à froid après redémarrage ; 5 lancements de partie ; 5 changements d'écran : relever la valeur la plus lente.
  2. Filmer l'écran pendant 5 minutes d'une partie à 12 c/s avec un serpent d'au moins 200 cases ; extraire les instants des pas et les images par seconde.
  3. Filmer 20 commandes en « Glissement » et 20 en « Flèches ».
  4. Mode Zen avec un serpent de 280 cases : refaire la mesure de fluidité.
- **Données** : Aucune.
- **Résultat attendu** : Démarrage 3 s au plus, lancement 1 s au plus, changement d'écran 0,5 s au plus ; 95 % des intervalles à ± 10 %, aucun supérieur au double, 50 images par seconde au moins ; commande appliquée au pas suivant, retour visuel en 100 ms au plus.

### CT-99 — Sons, musique et vibrations réels
- **Exigences** : EF-22 (CA-1, CA-2, CA-3), EF-21 (CA-3)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : non (procédure manuelle sur S22 et iPhone)
- **Préconditions** : S22 et iPhone ; volume moyen.
- **Étapes** :
  1. Pour chaque combinaison des trois réglages, jouer et noter ce qui est audible et ressenti.
  2. Terminer une partie par collision : durée perçue de la vibration (environ 300 ms) ; manger un bonbon spécial (80 ms).
  3. Passer à une autre application avec la musique active, puis revenir.
  4. Sur iPhone : vérifier l'absence de vibration et le réglage grisé.
- **Données** : Aucune.
- **Résultat attendu** : Chaque catégorie suit son réglage ; vibrations conformes sur Android ; la musique s'arrête hors du jeu et reprend au retour ; iPhone sans vibration ni erreur.

### CT-100 — Prise en main et lisibilité par trois personnes
- **Exigences** : ENF-10 (30 s, 3 personnes sur 3), ENF-11 (identification des 4 couleurs), ENF-12 (aucune confusion)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : non (test avec trois personnes extérieures à l'équipe projet)
- **Préconditions** : Trois personnes qui n'ont jamais vu le jeu ; S22 ; chronomètre ; consignes neutres.
- **Étapes** :
  1. Sans aide, demander de lancer une partie : chronométrer l'ouverture jusqu'au premier pas ; compter les touchers.
  2. Demander de lancer une partie, puis de créer une sauvegarde : compter les touchers (2 au plus chacun).
  3. À bout de bras, présenter les quatre bonbons sur chaque décor : relever le nom donné à chaque couleur.
  4. Recueillir les difficultés de lecture (contrastes, tailles).
- **Données** : Fiche de résultats par personne.
- **Résultat attendu** : Trois personnes sur trois lancent une partie en 30 s au plus, sans aide ; 2 touchers au plus ; 12 identifications correctes sur 12 ; aucune difficulté de lecture bloquante.

### CT-101 — Endurance sur S22 : 2 heures, cycles de pause et de sauvegarde, arrêts brutaux
- **Exigences** : ENF-20 (2 heures, 50 pauses, 20 sauvegardes), ENF-14 (20 arrêts réels), EXS-14
- **Type** : fiabilité
- **Priorité** : moyenne
- **Automatisé** : non (procédure manuelle sur S22)
- **Préconditions** : S22 chargé ; progression fictive ; chronomètre.
- **Étapes** :
  1. Jouer 2 heures réparties sur les 7 modes.
  2. Faire 50 cycles pause/reprise et 20 cycles sauvegarde/restauration.
  3. Faire 20 arrêts brutaux (fermeture forcée, extinction par maintien du bouton) pendant une partie et juste après un record ou un réglage : relever la progression à chaque redémarrage.
- **Données** : Aucune.
- **Résultat attendu** : Aucun arrêt ni blocage ; aucune perte de donnée enregistrée plus de 1 s avant l'arrêt ; progression jamais incomplète.

### CT-102 — Transfert de la progression entre deux téléphones (SCN-04)
- **Exigences** : EF-23 (CA-1, CA-2, CA-4, RG-69, HYP-50), EF-24 (CA-1), ENF-15, SCN-04, R-07
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur deux téléphones)
- **Préconditions** : S22 avec progression, second téléphone avec le jeu installé, moyen de transfert au choix (câble, message).
- **Étapes** :
  1. Sur le S22 : « Sauvegarde » > « Créer une sauvegarde » ; retrouver le fichier dans Fichiers (Téléchargements).
  2. Envoyer le fichier au second téléphone ; « Restaurer », choisir le fichier, « Fusionner ».
  3. Comparer records, skins, réglages.
  4. Remplir le stockage du S22 jusqu'à saturation et créer une sauvegarde : relever le message (E-03 avec Chrome 149 ou plus, sinon échec signalé par le système).
  5. Sur le S22 avec Chrome 149 ou plus (fenêtre d'enregistrement qui permet de choisir l'emplacement) : créer une sauvegarde, puis en créer une seconde en choisissant le premier fichier et en confirmant « Remplacer » ; restaurer ce fichier sur le second téléphone.
  6. Refaire en refusant le remplacement dans la fenêtre : relever que le fichier existant est intact, qu'aucune sauvegarde n'est écrite et qu'aucun message n'apparaît.
  7. Si la fenêtre du téléphone ne permet pas de choisir l'emplacement (téléchargement ou partage, par exemple sur iPhone) : consigner « sans objet » pour les deux étapes précédentes ; faire 10 créations successives et vérifier qu'aucun fichier antérieur n'a changé (le système suffixe les noms).
- **Données** : Aucune.
- **Résultat attendu** : Fichier visible et partageable ; progression identique sur le second téléphone ; en saturation la progression reste intacte et l'échec est signalé. Remplacement confirmé : le fichier contient la nouvelle sauvegarde et se restaure ; remplacement refusé : fichier existant intact, rien d'écrit, aucun message ; sans choix d'emplacement : l'étape est sans objet et aucun fichier n'est remplacé.
### CT-103 — Mise à jour réelle d'une version à la suivante sur téléphone
- **Exigences** : ENF-18 (mise à jour, 100 % de la progression), EF-29, EXS-16
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur S22 et iPhone, à la première version suivante publiée)
- **Préconditions** : Version N installée avec progression ; version N+1 publiée.
- **Étapes** :
  1. Ouvrir le jeu connecté : relever « Nouvelle version disponible » dans « À propos ».
  2. Ne pas toucher « Installer » : fermer et rouvrir, constater que la version ne change pas.
  3. Toucher « Installer » ; relever le message et comparer la progression ; passer en mode avion et rouvrir.
  4. Sur iPhone, ne jamais supprimer l'icône pour mettre à jour.
- **Données** : Aucune.
- **Résultat attendu** : Mise à jour uniquement sur consentement ; progression intacte ; jeu fonctionnel hors ligne ensuite.

### CT-104 — Mise à jour : rien pendant une partie, rien en mode avion
- **Exigences** : EF-29 (CA-4, CA-5, RG-89), ENF-09 (échange admis, 10 Ko par ouverture)
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_104_mise_a_jour_contexte`, `tests/acceptance/installation.spec.ts`)
- **Préconditions** : Version 1.0.0 installée ; version 1.1.0 servie.
- **Étapes** :
  1. Lancer une partie ; faire détecter la version plus récente pendant la partie (mise à jour de l'agent de service) : relever tout élément affiché pendant la partie, pause comprise.
  2. Revenir au menu : relever le repère « Mise à jour » et « À propos ».
  3. Mode avion (réseau coupé) : ouvrir « À propos ».
  4. Relever les requêtes réseau d'une ouverture connectée (nombre, taille cumulée, destination).
- **Données** : Aucune.
- **Résultat attendu** : Rien ne s'affiche pendant la partie ni en pause ; la proposition n'apparaît que dans « À propos » et sur le menu ; en mode avion aucune proposition ni erreur, « Prêt à jouer hors ligne » visible ; la vérification se limite à l'origine locale de test et à moins de 10 Ko (valeur à confirmer sur l'adresse publiée par le CT d'adresse publiée).

### CT-105 — Panneau « Installer le jeu » dans le navigateur
- **Exigences** : EF-29 (RG-92), ENF-01 (installation guidée), 05 § 4.12 (E14)
- **Type** : fonctionnel
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_105_panneau_installation`, `tests/acceptance/installation.spec.ts`)
- **Préconditions** : Jeu ouvert dans le navigateur, non installé ; agents utilisateurs Android et iPhone simulés.
- **Étapes** :
  1. Menu : relever le bandeau « Pour jouer hors ligne, installez le jeu. » et le bouton « Installer le jeu ».
  2. Ouvrir le panneau sous un agent utilisateur Android sans invite : relever les 3 étapes (⋮, « Installer l'application », ouverture depuis l'icône) ; avec l'événement `beforeinstallprompt` simulé : relever le bouton « Installer le jeu ».
  3. Sous un agent utilisateur iPhone : relever les 3 étapes (Partager, « Sur l'écran d'accueil », « Ajouter »), le conseil de tenir le téléphone à la verticale et le rappel du premier lancement connecté ; le lien « Autre téléphone ».
  4. Simuler `appinstalled` : relever « Jeu installé. Ouvrez-le depuis son icône sur l'écran d'accueil. ».
  5. Simuler le mode application installée (`display-mode: standalone`) : le bandeau disparaît.
  6. Fermer le panneau par « ‹ Retour » : le panneau ne bloque rien et ne revient pas imposé.
- **Données** : Agents utilisateurs de recette.
- **Résultat attendu** : Seules les étapes du téléphone détecté sont affichées ; le bandeau n'existe que dans le navigateur ; le panneau est une page qui se ferme par « Retour » ; textes conformes à 05 § 5.

### CT-106 — Textes de référence de 05 et 02 présents, exacts, en français
- **Exigences** : ENF-13 (langue), ENF-16 (E-01 à E-08), EF-01 (RG-03), EF-25 (RG-74), EF-27 (RG-79), EF-28 (RG-81)
- **Type** : fonctionnel
- **Priorité** : haute
- **Automatisé** : oui (`ct_106_textes_de_reference` (`tests/unit/format.test.ts`, `tests/unit/textes.test.ts`), comparaison à une liste de textes dans `tests/fixtures/textes.json` reprenant 05 § 5)
- **Préconditions** : Tous les écrans atteignables ; progression fictive couvrant chaque état.
- **Étapes** :
  1. Parcourir E1 à E14 de 05 § 3 et déclencher chaque message (erreurs E-01 à E-08, partie interrompue, orientation verticale, installation).
  2. Comparer chaque texte, caractère pour caractère, à la liste de référence (guillemets, accents, points, N remplacé par un nombre).
  3. Relever tout texte affiché absent de la liste (texte non prévu).
  4. Pour E-07, le message de 02 (RG-73) ; 05 le reprendra dans sa liste de textes : relever tout écart entre 02 et 05.
- **Données** : Liste de textes extraite de 05 § 5 et de 02.
- **Résultat attendu** : Tous les textes de référence sont affichés exactement ; aucun texte hors liste n'est en anglais ; messages passagers et zones vivantes portent les mêmes textes.

### CT-107 — Charte de couleurs : contrastes calculés et valeurs réellement appliquées
- **Exigences** : ENF-11 (3:1 et 4,5:1), ENF-12, 05 § 7.1
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_107_contrastes_charte`, `tests/acceptance/accessibilite.spec.ts`)
- **Préconditions** : Profil S22 ; quatre décors débloqués.
- **Étapes** :
  1. Calculer, avec la formule WCAG 2.2, les contrastes des couples de la charte de 05 § 7.1 (texte principal et secondaire, boutons, bordures, focus, erreur, succès) et comparer aux valeurs mesurées annoncées.
  2. Lire les couleurs calculées dans le navigateur pour chaque texte et contrôle des 14 écrans (états normal, focus, désactivé, pressé) et vérifier qu'elles proviennent de la charte.
  3. Pour les éléments de jeu, relever dans le canevas les couleurs des éléments et du fond voisin pour chaque décor, détails de décor (étoiles, nébuleuses) compris, et calculer le rapport au pire point.
  4. Vérifier que le texte désactivé « Non disponible sur ce téléphone » garde 4,5:1.
- **Données** : Valeurs de 05 § 7.1 : fond `#0B1026`, texte `#F5F7FF`, secondaire `#B8C0E8`, bouton `#FFD84D`, focus `#FFFFFF`, erreur `#FFA3A3`, etc.
- **Résultat attendu** : Tous les textes à 4,5:1 au moins, tous les contrôles, bordures et éléments de jeu à 3:1 au moins, y compris contre les détails du décor le plus clair ; écarts avec les valeurs annoncées de 05 consignés ; rose et violet ont des silhouettes distinctes (leur contraste mutuel est faible).

### CT-108 — Focus, dialogues et touche Échap
- **Exigences** : ENF-12 (accessibilité), EF-25 (RG-74), EF-24 (RG-71), 05 § 4.5, § 4.11, § 6
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_108_focus_dialogues_echap` (`tests/acceptance/classique.spec.ts`))
- **Préconditions** : Profil S22 avec clavier.
- **Étapes** :
  1. Ouvrir la pause : le focus arrive sur « Reprendre » ; Échap équivaut à « Reprendre ».
  2. « Abandonner » : le focus arrive sur « Non » ; Échap équivaut à « Non ».
  3. Ouvrir le résumé de restauration : focus sur « Annuler » ; Échap annule sans rien modifier.
  4. Dans chaque boîte, Tab et Maj+Tab restent dans la boîte (piège de focus voulu) et Échap la ferme.
  5. Au retour d'un sous-écran, le focus revient au bouton qui l'a ouvert ; après « Valider », le focus est sur « Rejouer ».
  6. Mesurer le contour de focus (3 px, décalé de 2 px) sur chaque élément focalisable ; vérifier qu'aucun élément fixe ne le masque.
- **Données** : Aucune.
- **Résultat attendu** : Comportements conformes à 05 § 4.5, § 4.11 et § 6 ; aucun piège de focus hors des boîtes ; contour de focus toujours visible.

### CT-109 — Rôles, noms accessibles et état non porté par la couleur seule
- **Exigences** : ENF-12 (accessibilité), ENF-11 (couleur non porteuse), EF-12 (RG-33, halos), EF-21 (RG-62), 05 § 6
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_109_roles_et_etats`, `tests/acceptance/accessibilite.spec.ts`)
- **Préconditions** : Profil S22.
- **Étapes** :
  1. Lister par `getByRole` : boutons natifs, interrupteurs `switch`, groupe radio « Commande », onglets `tablist`, boîtes `dialog` avec titre, bouton « Pause », « Mode précédent », « Haut »/« Bas »/« Gauche »/« Droite ».
  2. Relever pour chaque état (interrupteur, skin choisi, verrouillé, mode mystère, record, erreur) l'indicateur textuel ou graphique non coloré.
  3. Passer l'écran en niveaux de gris (filtre) et relire les écrans de réglages, skins et fin.
  4. Mode Trou noir : relever que les deux paires de halos diffèrent par la forme (anneau plein, anneau en pointillés) en plus de la teinte.
  5. Vérifier `lang="fr"`, le titre de page, l'intitulé « Aire de jeu » du canevas et les zones vivantes (compte à rebours, pause, fin de partie, effet de bonus, messages passagers de 6 s, état de la mise à jour).
- **Données** : Aucune.
- **Résultat attendu** : Tous les contrôles ont rôle et nom ; aucune information ne dépend de la couleur seule ; les annonces dynamiques sont émises ; le canevas a son intitulé.

### CT-110 — Mouvement réduit et clignotements
- **Exigences** : ENF-12 (aucun clignotement au-delà de 3 par seconde), EF-05 (RG-20), 05 § 6 (mouvement)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_110_mouvement_reduit`, `tests/acceptance/accessibilite.spec.ts`)
- **Préconditions** : Profil S22 ; émulation `prefers-reduced-motion: reduce` puis `no-preference`.
- **Étapes** :
  1. Sans préférence : au 10e bonbon, échantillonner l'arc-en-ciel toutes les 33 ms pendant 5 s et compter les changements de couleur par zone et par seconde ; refaire pour les effets Turbo, Inversion et le décompte.
  2. Avec `reduce` : relever que l'arc-en-ciel est un dégradé fixe, que les transitions d'écran sont supprimées (durée 0) et que le panneau du compte à rebours n'est pas animé.
  3. Mettre en pause : vérifier que tout mouvement du serpent, des effets et du décor s'arrête.
- **Données** : Échantillonnage par lecture de pixels et horloge Playwright.
- **Résultat attendu** : Au plus 3 changements de couleur par seconde et par zone ; sous `reduce`, aucun mouvement décoratif et un arc-en-ciel statique avec au moins 5 teintes ; la pause fige tout.

### CT-111 — Écrans hors partie défilables, texte agrandi à 200 %
- **Exigences** : ENF-04 (aucun texte caché), ENF-12 (texte agrandi), EF-01 (RG-02), 05 § 1 et § 6
- **Type** : accessibilité
- **Priorité** : moyenne
- **Automatisé** : oui (`ct_111_defilement_et_zoom`, `tests/acceptance/accessibilite.spec.ts`) ; appareils réels : CT téléphone
- **Préconditions** : Profil iPhone SE paysage (667 × 375) ; taille de police racine portée à 200 %.
- **Étapes** :
  1. Pour E2, E7, E8, E9, E10, E11, E14 : dérouler le contenu et vérifier que chaque bouton est atteignable et complet (aucun texte tronqué ni masqué).
  2. Vérifier la présence de l'indice de défilement (ligne partielle) sur la liste des modes.
  3. Passer la taille du texte à 200 % : relire les mêmes écrans.
  4. Sur l'écran de fin, réduire la hauteur du viewport (simulation du clavier du téléphone en paysage, 375 px réduits à 180 px) et mettre le champ du nom au focus.
- **Données** : Simulation du clavier par réduction de hauteur.
- **Résultat attendu** : Tout le contenu reste accessible par défilement vertical, sans perte d'information ni de bouton ; à 200 % rien n'est coupé ; le champ « Votre nom » et « Valider » restent visibles au-dessus du clavier simulé (HYP-36).

### CT-112 — Ergonomie des flèches et taille des cases sur le plus petit écran
- **Exigences** : ENF-04 (cases 3 mm), ENF-12 (flèches 12 mm), EF-07 (CA-1, CA-3), ENF-10, HYP-34 (05)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur iPhone SE 3 ou équivalent, 3 personnes)
- **Préconditions** : Plus petit téléphone disponible (iPhone SE 3 ou Android 4,7 à 5 pouces) ; réglage « Flèches » ; règle graduée ; trois personnes.
- **Étapes** :
  1. Mesurer le côté d'une case et la taille des flèches à la règle.
  2. Faire jouer chaque personne 3 minutes en mode Classique avec la disposition en deux colonnes (Haut/Bas à gauche, Gauche/Droite à droite) : noter les erreurs de flèche, l'inconfort des pouces, la lisibilité des petites cases.
  3. Comparer avec le réglage « Glissement » sur le même appareil.
- **Données** : Fiche d'observation par personne.
- **Résultat attendu** : Cases d'au moins 3 mm et flèches de 12 mm ; chaque personne joue sans erreur répétée de flèche ; toute gêne est consignée pour décision (disposition de HYP-34 à confirmer ou à revoir).

### CT-113 — Défilement des écrans sur appareil réel
- **Exigences** : ENF-04, ENF-12, EF-01 (RG-02), 05 § 9
- **Type** : accessibilité
- **Priorité** : moyenne
- **Automatisé** : non (procédure manuelle sur S22 et iPhone SE)
- **Préconditions** : S22 et iPhone SE (ou équivalent) ; texte du système agrandi à 200 % pour la seconde passe.
- **Étapes** :
  1. Faire défiler au doigt la liste des modes, les skins, les réglages, « À propos », « Sauvegarde » et le panneau d'installation.
  2. Vérifier qu'un glissement dans ces écrans fait défiler sans déclencher d'action ni de rebond gênant, et qu'aucune commande de jeu n'est prise hors partie.
  3. Recommencer avec le texte du système agrandi.
- **Données** : Aucune.
- **Résultat attendu** : Tous les boutons sont atteignables et complets ; le défilement est fluide et sans action involontaire.

### CT-114 — Clavier du téléphone en paysage sur l'écran de fin
- **Exigences** : EF-18 (CA-1, CA-2, RG-50), ENF-10, HYP-36 (05)
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur S22 et iPhone)
- **Préconditions** : S22 et iPhone, orientation horizontale ; progression avec un dernier nom.
- **Étapes** :
  1. Entrer au tableau des records ; toucher le champ « Votre nom » : relever l'ouverture du clavier.
  2. Vérifier que le champ et « Valider » restent visibles au-dessus du clavier (défilement) et que la touche « Terminé » valide.
  3. Taper un nom, valider, vérifier « Nom enregistré : <nom> » ; refaire sans toucher le champ et vérifier que le record est enregistré avec le nom prérempli.
  4. Noter si des joueurs oublient de saisir leur nom (décision sur le focus automatique).
- **Données** : Aucune.
- **Résultat attendu** : Le champ, « Valider » et le résultat restent utilisables avec le clavier ouvert en paysage ; le record est enregistré dans tous les cas.

### CT-115 — Panneau « Installer le jeu » et mise à jour sur appareil réel
- **Exigences** : EF-29 (CA-1, CA-2, CA-3, CA-4, CA-5), ENF-01, ENF-18
- **Type** : installation
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle sur S22 et iPhone, avec deux versions publiées)
- **Préconditions** : Version 1.0.0 installée, 1.1.0 publiée ; connexion Wi-Fi.
- **Étapes** :
  1. Ouvrir le lien dans le navigateur : relever le bandeau et le panneau « Installer le jeu » avec les étapes du bon téléphone (Partager introuvable en paysage sur iPhone : conseil de la verticale).
  2. Avec 1.1.0 publiée : relever « Nouvelle version 1.1.0 disponible » seulement dans « À propos » et sur le menu, jamais en partie ; fermer et rouvrir sans « Installer » : version inchangée.
  3. Toucher « Installer », couper la connexion en cours de téléchargement : relever E-06 et le fonctionnement en mode avion.
  4. Refaire la mise à jour jusqu'au bout : progression identique.
- **Données** : Aucune.
- **Résultat attendu** : Parcours conforme à 05 § 2 (Ami : installer ; Demandeur : mettre à jour) et aux critères CA-1 à CA-5 d'EF-29.

### CT-116 — Restauration impossible à enregistrer : E-07
- **Exigences** : EF-24 (CA-5, RG-73), ENF-16 (E-07), EXS-12 (message sans trace), ENF-14
- **Type** : erreur
- **Priorité** : haute
- **Automatisé** : oui (`ct_116_restauration_e07`, `tests/acceptance/sauvegarde.spec.ts`, échec d'écriture simulé sur `IDBDatabase.transaction`)
- **Préconditions** : Progression fictive non vide ; fichier valide ; sonde qui annule la transaction d'écriture ou lève `QuotaExceededError`.
- **Étapes** :
  1. Choisir le fichier valide, lire le résumé, toucher « Fusionner » avec l'écriture en échec.
  2. Relever le message affiché et l'absence de « Restauration terminée… ».
  3. Fermer puis rouvrir le jeu (profil persistant) : comparer records, skins, compteurs et réglages à l'état d'avant.
  4. Relever la console et les requêtes réseau.
- **Données** : Sonde de recette ; fichier valide fabriqué.
- **Résultat attendu** : « La restauration n'a pas pu être enregistrée. Votre progression n'a pas changé. (E-07) » s'affiche à la place du message de succès ; après réouverture la progression est identique à celle d'avant ; aucune trace technique, console silencieuse.

### CT-117 — Analyse automatique d'accessibilité (axe-core) sur chaque écran
- **Exigences** : ENF-12 (accessibilité), ENF-11 (texte), ENF-13 (langue déclarée), 05 § 6
- **Type** : accessibilité
- **Priorité** : haute
- **Automatisé** : oui (`ct_117_analyse_axe` (`tests/acceptance/classique.spec.ts`, `tests/acceptance/progression.spec.ts`, `tests/acceptance/socle.spec.ts`), @axe-core/playwright)
- **Préconditions** : Profils S22 et iPhone SE ; dépendance de test @axe-core/playwright épinglée (03 § 11) ; tous les écrans de 05 § 3 atteignables avec progression fictive.
- **Étapes** :
  1. Pour chaque écran E1 à E14, dans ses états principaux (menu avec et sans repère de mise à jour, mode verrouillé, pause, confirmation d'abandon, fin de partie avec saisie du nom, records vides et pleins, skins, réglages avec vibrations indisponibles, à propos dans ses états A à D, sauvegarde et résumé de restauration, messages d'erreur, orientation verticale, panneau d'installation) : lancer l'analyse avec les étiquettes `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.
  2. Classer les résultats par impact (mineur, modéré, sérieux, critique) ; joindre la liste des violations modérées et mineures au rapport.
  3. L'aire de jeu (canevas) n'étant pas analysable par axe-core, ses contrastes restent vérifiés par le calcul des pixels (CT des contrastes de la charte et des silhouettes).
- **Données** : Aucune.
- **Résultat attendu** : Aucune violation d'impact sérieux ou critique sur aucun écran ; toute violation modérée ou mineure est consignée avec la règle, l'élément et l'écran, pour décision.

### CT-118 — Validateur : imbrication, chaînes mal formées, marques bidirectionnelles, types d'objets
- **Exigences** : EXS-17 (validateur), EF-27 (RG-79, borne 9 999), EXS-04 (nom, refus total), EXS-12
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_118_validateur_complements` (`tests/unit/enveloppe.test.ts`, `tests/unit/validation.test.ts`))
- **Préconditions** : Progression fictive non vide ; corpus complété dans `tests/fixtures/saves/`.
- **Étapes** :
  1. Restaurer : 100 000 crochets imbriqués ; nom contenant un substitut isolé ; nom avec U+200F, U+200E, U+061C, U+202E, U+2066 ; `records` sous forme de tableau ; `data` sous forme de tableau ; `skins` ou `settings` sous forme de tableau ; objet attendu remplacé par un tableau et inversement.
  2. Restaurer un fichier valide dont un nom contient un emoji composé avec liant U+200D, et un nom contenant un caractère de contrôle (`\p{Cc}`).
  3. Après chaque fichier : relever le message, les exceptions de page (`pageerror`), la console, et comparer la progression.
  4. Validateur de la partie en cours : `candiesEaten` à 0, 288, 289, 9 999 (acceptés) puis 10 000, -1, 1.5, `NaN` (refusés).
- **Données** : Fichiers fabriqués par la fabrique de données de test.
- **Résultat attendu** : Chaque fichier piégé donne E-01 sans exception non captée ni blocage et sans modification ; l'emoji composé (liant U+200D) est accepté ; le caractère de contrôle est refusé. Les valeurs de 0 à 9 999 sont acceptées pour les bonbons mangés d'une partie, celles hors plage ou non entières sont refusées.
### CT-119 — Paramètre d'adresse ?seed= : analyse stricte, aucun autre point d'entrée
- **Exigences** : EXS-17 (?seed=, manifeste), ENF-19 (aléa reproductible), RSK-18
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_119_parametre_seed` (`tests/acceptance/classique.spec.ts`, `tests/acceptance/socle.spec.ts`, `tests/unit/random.test.ts`))
- **Préconditions** : Premier lancement : stockage du navigateur vide ; jeu servi par `scripts/serve.mjs` sur 127.0.0.1.
- **Étapes** :
  1. Ouvrir l'adresse avec `?seed=7`, `?seed=4294967295` : la partie est reproductible (mêmes positions de bonbons deux fois).
  2. Ouvrir avec `?seed=abc`, `?seed=-1`, `?seed=1.5`, `?seed=4294967296`, `?seed=99999999999`, `?seed=<img src=x onerror=alert(1)>`, `?seed=` vide, `?seed=1&seed=2`, `?autre=3`, `#seed=5` : lancer une partie.
  3. Relever les messages, les exceptions, les dialogues, et rechercher la valeur reçue dans tout le DOM et le canevas.
- **Données** : Adresses de recette.
- **Résultat attendu** : Seul un entier de 1 à 10 chiffres au plus égal à 4 294 967 295 est pris en compte ; toute autre valeur est ignorée sans message ni erreur (tirage aléatoire) ; aucun autre paramètre ni le fragment n'est lu ; la valeur n'apparaît jamais dans le DOM.

### CT-120 — Manifeste sans entrée supplémentaire, agent de service restreint
- **Exigences** : EXS-17 (manifeste, agent de service), EXS-16, EXS-08
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_120_manifeste` (`tests/acceptance/socle.spec.ts`))
- **Préconditions** : Jeu installé (agent de service actif) ; serveur de test pouvant servir des réponses altérées.
- **Étapes** :
  1. Lire le manifeste : absence de `share_target`, `file_handlers`, `protocol_handlers`, `launch_handler`.
  2. Depuis la page, envoyer à l'agent de service un message de type inconnu, puis un type connu avec des champs invalides, puis un objet non plain : relever le cache, le consentement enregistré, les réponses et les erreurs.
  3. Émettre depuis la page une requête `POST` vers l'origine, une requête hors portée et une requête vers une autre origine : vérifier que l'agent de service n'y répond pas.
  4. Au moment d'une mise à jour consentie, servir des réponses non `ok`, redirigées, de type opaque, ou d'empreinte fausse pour un fichier à pré-cacher : relever le contenu du cache.
  5. Compter les appels à `fetch` de l'agent de service hors installation et mise à jour consentie.
- **Données** : Réponses altérées fabriquées par le test.
- **Résultat attendu** : Aucun point d'entrée ajouté au manifeste ; messages inconnus ou invalides sans effet ; l'agent ne répond qu'aux `GET` de son origine et de sa portée ; seules les réponses `ok`, `basic`, non redirigées et d'empreinte exacte entrent dans le cache ; aucun `fetch` hors installation ou mise à jour consentie.

### CT-121 — Serveur local de développement : confinement, Host, méthodes, écoute
- **Exigences** : EXS-18 (scripts/serve.mjs)
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_121_serveur_local` (`tests/acceptance/serveur.spec.ts`), requêtes HTTP brutes)
- **Préconditions** : Construction `dist/` servie par `scripts/serve.mjs` sur un port libre ; fichier sentinelle en dehors de `dist/` ; lien symbolique d'essai pointant hors de `dist/`.
- **Étapes** :
  1. Requêtes : `/..%2f..%2fpackage.json`, `/%2e%2e/`, `/%2e%2e%2fpackage.json`, `/../package.json` (chemin brut), `/index.html%00.png`, `/lien-symbolique`, `/` répertoire sans index et sous-répertoire.
  2. Requêtes avec en-tête `Host: exemple.test` puis `Host: 127.0.0.1:<port>` et `Host: localhost:<port>`.
  3. Méthodes `POST`, `PUT`, `DELETE`, `OPTIONS` ; méthode `HEAD`.
  4. Relever l'adresse d'écoute (`ss -ltn`) et tenter la connexion par une adresse non locale de la machine.
  5. Lire les en-têtes de réponse : aucun en-tête de sécurité ajouté ; vérifier que la balise CSP est le premier élément de `<head>`.
- **Données** : Fichiers sentinelles fictifs.
- **Résultat attendu** : Tout chemin hors de `dist/` donne 404 ; l'octet nul est refusé ; aucun lien symbolique n'est suivi hors de `dist/` ; `Host` inconnu donne 421 ; seules `GET` et `HEAD` sont acceptées ; écoute sur 127.0.0.1 seulement ; aucune liste de répertoire ; aucun en-tête CSP du serveur ; balise CSP en tête du `<head>`.

### CT-122 — Dépôt public : liste de contrôle, adresse de commit, aucune donnée personnelle
- **Exigences** : EXS-19 (liste de contrôle, historique), EXS-15, EXS-01
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_122_depot_public`, `tests/acceptance/depot.spec.ts`)
- **Préconditions** : Copie propre du dépôt avec son historique.
- **Étapes** :
  1. Lire `docs/guide-exploitation.md` : liste de contrôle avant la première publication (authentification à plusieurs facteurs, aucun autre site Pages ou organisation dédiée, domaine personnalisé, protection de `main` et des étiquettes `v*`, environnement `github-pages` limité aux étiquettes `v*`, source « GitHub Actions », approbation des workflows externes, alertes Dependabot, analyse des secrets et protection à l'envoi, signalement privé).
  2. Lire `SECURITY.md` : signalement privé indiqué sans adresse électronique ; mention que GitHub reçoit l'adresse IP du téléphone à l'installation, aux mises à jour et à la vérification de version.
  3. Lister les auteurs et adresses de tous les commits et les métadonnées des fichiers : aucune adresse personnelle réelle, adresse conforme à l'expression du besoin ou `noreply`.
  4. Rechercher dans le dépôt un fichier `CNAME` et toute donnée personnelle réelle dans les tests (noms fictifs seulement).
- **Données** : Aucune.
- **Résultat attendu** : Toutes les rubriques de la liste de contrôle sont présentes ; `SECURITY.md` ne publie aucune adresse électronique et décrit l'exposition de l'adresse IP ; aucune donnée personnelle ni adresse personnelle dans l'historique ou les tests.

### CT-123 — Réglages réels du dépôt et du compte avant la première publication
- **Exigences** : EXS-19 (contrôle des réglages), EXS-16, EXS-15
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : non (procédure manuelle du mainteneur avec `gh api`, avant la première publication)
- **Préconditions** : Dépôt public créé sur le compte du demandeur ; `gh` authentifié.
- **Étapes** :
  1. Vérifier l'authentification à plusieurs facteurs du compte et l'absence d'autre site Pages (ou l'organisation dédiée).
  2. `gh api` sur les règles de protection de `main` et des étiquettes `v*`, sur l'environnement `github-pages` (étiquettes `v*` seulement) et sur la source de Pages (« GitHub Actions »).
  3. Vérifier les alertes Dependabot, l'analyse des secrets et la protection à l'envoi, le signalement privé, l'approbation des workflows externes, l'option de blocage des poussées exposant l'adresse électronique.
  4. Vérifier qu'aucun domaine personnalisé n'est configuré, ou qu'il est vérifié avec « Enforce HTTPS ».
- **Données** : Compte réel du demandeur.
- **Résultat attendu** : Tous les réglages de la liste sont conformes à EXS-19 ; tout écart est consigné avant la première publication.

### CT-124 — Construction et workflows durcis : scripts npm, cooldown, étiquette issue de main, artefact limité
- **Exigences** : EXS-20 (durcissement), EXS-11, EXS-10, EXS-16
- **Type** : sécurité
- **Priorité** : haute
- **Automatisé** : oui (`ct_124_durcissement_construction` (`tests/unit/depot.test.ts`)) ; zizmor ou actionlint par `uvx` si disponible
- **Préconditions** : Copie propre du dépôt.
- **Étapes** :
  1. Lire `.npmrc` : `ignore-scripts=true` ; vérifier que `npm ci` et la construction réussissent avec ce réglage.
  2. Lire `.github/dependabot.yml` : écosystèmes `npm` et `github-actions` avec `cooldown` de 7 jours.
  3. Lire les workflows : `actions/checkout` avec `persist-credentials: false` ; aucun cache dans `release.yml` ; aucune expression de contexte GitHub interpolée dans un `run:` ; outils d'analyse installés à version fixe avec condensat vérifié ; aucune action tierce de publication de version (`gh release create`).
  4. Lire `release.yml` : tâche de construction sans installation de navigateurs de test ; CI au vert exigée sur le même commit ; contrôle que l'étiquette pointe sur un ancêtre de `origin/main`.
  5. Exécution à blanc du contrôle d'ascendance dans un dépôt temporaire : étiquette posée sur `main` acceptée, étiquette posée sur une branche hors `main` refusée.
  6. Ajouter un fichier étranger dans `dist/` puis lancer le contrôle « artefact Pages égal à la liste pré-cachée » : la construction doit échouer ; retirer le fichier : elle réussit.
- **Données** : Dépôt temporaire fabriqué par le test.
- **Résultat attendu** : Tous les réglages sont présents ; l'étiquette hors `main` est refusée ; un artefact contenant un fichier non pré-caché fait échouer la construction ; zizmor ou actionlint sans alerte (ou NON EXÉCUTÉ avec la raison).

### CT-125 — Contrôle des dates : tolérée en local, stricte à l'import
- **Exigences** : RG-94, EF-17 (RG-49, RG-86, date affichée), EF-24 (RG-72, date future), EXS-04 (dates), HYP-49
- **Type** : limite
- **Priorité** : haute
- **Automatisé** : oui (`ct_125_controle_des_dates` : à créer en renommant le test « HYP-49 » de `tests/acceptance/progression.spec.ts` et les tests de dates de `tests/unit/validation.test.ts`)
- **Préconditions** : Horloge Playwright réglable ; progression fictive ; profil persistant temporaire.
- **Étapes** :
  1. Avancer l'horloge du téléphone de 2 ans, terminer une partie (record daté dans le futur), remettre l'horloge à l'heure, rouvrir le jeu : relever le tableau et les messages.
  2. Écrire dans la progression locale un record daté dans le futur et rouvrir : le record est gardé et affiché avec sa date, sans repli (RG-84) ni E-05.
  3. Importer une sauvegarde dont une date de record ou de création est postérieure de 23 h 59 à l'heure du téléphone, puis de 24 h 01.
  4. Importer une sauvegarde de date de création invalide ou antérieure au 01/01/2026.
- **Données** : Fichiers fabriqués par la fabrique de données de test ; heure fixée à 12:00:00 le 01/11/2026.
- **Résultat attendu** : La progression locale n'est jamais rejetée à cause d'une date future ; un fichier importé à plus de 24 h dans le futur est refusé (« Ce fichier n'est pas une sauvegarde valide de Serpent Cosmique. Rien n'a été modifié. (E-01) »), à moins de 24 h il est accepté ; une date invalide est refusée.

## 3. Couverture des exigences

### 3.1 Exigences fonctionnelles
| Exigence | Cas de test |
|---|---|
| EF-01 | CT-01, CT-02, CT-03, CT-60, CT-92, CT-106, CT-111, CT-113 |
| EF-02 | CT-04, CT-05, CT-06, CT-07, CT-08, CT-09, CT-94, CT-96 |
| EF-03 | CT-05, CT-18, CT-21 |
| EF-04 | CT-19, CT-24, CT-45 |
| EF-05 | CT-20, CT-24, CT-88, CT-110 |
| EF-06 | CT-11, CT-12, CT-14, CT-97 |
| EF-07 | CT-13, CT-14, CT-82, CT-88, CT-97, CT-112 |
| EF-08 | CT-15, CT-16, CT-17 |
| EF-09 | CT-22, CT-23 |
| EF-10 | CT-25, CT-26 |
| EF-11 | CT-27, CT-28 |
| EF-12 | CT-29, CT-109 |
| EF-13 | CT-30, CT-31 |
| EF-14 | CT-08, CT-32 |
| EF-15 | CT-03, CT-33, CT-34, CT-53 |
| EF-16 | CT-06, CT-08, CT-23, CT-24, CT-34, CT-35, CT-36, CT-79 |
| EF-17 | CT-24, CT-32, CT-37, CT-38, CT-125 |
| EF-18 | CT-24, CT-39, CT-40, CT-41, CT-60, CT-92, CT-114 |
| EF-19 | CT-42, CT-43, CT-44, CT-62 |
| EF-20 | CT-21, CT-42, CT-45 |
| EF-21 | CT-46, CT-47, CT-69, CT-94, CT-99, CT-109 |
| EF-22 | CT-48, CT-49, CT-99 |
| EF-23 | CT-50, CT-51, CT-102 |
| EF-24 | CT-44, CT-52, CT-53, CT-54, CT-55, CT-56, CT-102, CT-108, CT-116, CT-125 |
| EF-25 | CT-17, CT-26, CT-32, CT-49, CT-59, CT-60, CT-96, CT-97, CT-106, CT-108 |
| EF-26 | CT-10, CT-26, CT-61, CT-96 |
| EF-27 | CT-62, CT-96, CT-106, CT-118 |
| EF-28 | CT-10, CT-61, CT-69, CT-82, CT-94, CT-96, CT-106 |
| EF-29 | CT-66, CT-67, CT-103, CT-104, CT-105, CT-115 |

### 3.2 Exigences non fonctionnelles : méthode et seuil
| Exigence | Seuil | Méthode de mesure | Cas de test |
|---|---|---|---|
| ENF-01 | Guide en 3 étapes, 10 minutes, 0 €, sans compte payant ni mode développeur | chronométrage sur S22 et iPhone suivant le guide seul ; relecture automatisée du guide | CT-63, CT-64, CT-91, CT-93, CT-94, CT-105, CT-115 |
| ENF-02 | 50 Mo au plus | taille de `dist/` et `storage.estimate()` ; informations de stockage du téléphone | CT-64, CT-93, CT-94 |
| ENF-03 | Android 12 ou ultérieur dont S22 ; iOS 17 ou ultérieur | profils Playwright (Chromium, WebKit en CI) ; appareils réels | CT-69, CT-93, CT-94 |
| ENF-04 | grille 24 × 12 entière ; cases de 4 mm (S22) et 3 mm (autres) ; rien caché | mesure de la disposition sur 4 profils et 2 commandes ; règle sur appareil | CT-82, CT-97, CT-111, CT-112, CT-113 |
| ENF-05 | démarrage 3 s (S22) ou 5 s ; lancement de partie 1 s ; changement d'écran 0,5 s | mesure indicative avec processeur ralenti ; 5 essais sur téléphone, valeur la plus lente | CT-83, CT-98 |
| ENF-06 | 95 % des intervalles à ± 10 %, aucun supérieur au double ; 50 images par seconde (S22), 30 (autres) | ordonnanceur à 60 et 120 Hz simulés ; mesure indicative sur poste ; vidéo haute fréquence sur S22 | CT-84, CT-98 |
| ENF-07 | commande appliquée au pas ; retour visuel des flèches en 100 ms | 20 commandes à l'horloge simulée ; vidéo haute fréquence | CT-13, CT-85, CT-98 |
| ENF-08 | 70 records, 16 skins, 288 cases, compteurs à 1 000 000 000 ; fichier de 50 Ko au plus | jeu de données maximal ; serpent de 280 cases sur téléphone | CT-58, CT-84, CT-98 |
| ENF-09 | aucun échange en mode avion, 0 octet sur 7 jours ; vérification de version de 10 Ko au plus | parcours hors ligne après redémarrage du profil ; comptage des requêtes ; relevé de consommation sur téléphone | CT-24, CT-65, CT-66, CT-95, CT-104 |
| ENF-10 | 30 s pour lancer une partie ; 2 touchers ; règles de 2 phrases et 200 caractères | comptage des touchers et des caractères ; 3 personnes | CT-01, CT-02, CT-50, CT-52, CT-100, CT-112, CT-114 |
| ENF-11 | 3:1 pour les éléments de jeu, 4,5:1 pour le texte, sur 4 décors ; 4 couleurs identifiées par 3 personnes sur 3 | calcul WCAG sur pixels et styles ; test à 3 personnes | CT-21, CT-92, CT-100, CT-107, CT-109, CT-117 |
| ENF-12 | cibles 57 px (9 mm), flèches 76 px (12 mm), majuscules de 1,8 mm, 3 changements de couleur par seconde au plus, jeu complet aux flèches | mesure des boîtes, polices et échantillonnage ; règle sur appareil | CT-13, CT-39, CT-46, CT-59, CT-88, CT-92, CT-97, CT-100, CT-107, CT-108, CT-109, CT-110, CT-111, CT-112, CT-113, CT-117 |
| ENF-13 | 100 % en français ; JJ/MM/AAAA ; milliers séparés par une espace | extraction de tous les textes ; relecture exhaustive | CT-02, CT-78, CT-79, CT-87, CT-91, CT-106, CT-117 |
| ENF-14 | écriture en 1 s au plus et avant l'écran de fin ; 20 arrêts brutaux sans perte | SIGKILL du navigateur, lecture d'IndexedDB ; 20 arrêts réels sur S22 | CT-36, CT-56, CT-79, CT-80, CT-86, CT-101, CT-116 |
| ENF-15 | création 2 s, restauration 3 s ; fichiers anciens acceptés ; aucun fichier supprimé, ni remplacé sans choix et confirmation du joueur | chronométrage avec le jeu de données maximal ; empreinte du premier fichier ; 10 sauvegardes successives sans choix d'emplacement ; remplacement confirmé puis refusé (EF-23 CA-4) | CT-50, CT-51, CT-52, CT-58, CT-102 |
| ENF-16 | aucun journal transmis ; E-01 à E-08 avec message et code | provocation de chaque code ; console et requêtes observées ; guide utilisateur | CT-51, CT-55, CT-67, CT-70, CT-78, CT-79, CT-106, CT-116 |
| ENF-17 | aucune permission hors vibration et fichier ; aucun compte ni service externe | sondes sur les API sensibles ; manifeste ; invites sur téléphone | CT-70, CT-72, CT-73, CT-93 |
| ENF-18 | progression conservée à 100 % ; aucune mise à jour automatique ; aucune expiration ; version MAJEUR.MINEUR.CORRECTIF | mise à jour entre deux constructions avec données maximales ; lecture de « À propos » | CT-63, CT-64, CT-66, CT-68, CT-77, CT-103, CT-115 |
| ENF-19 | valeurs des règles à un seul endroit ; aléa reproductible | rejeu avec graine ; modification de `rules.ts` sur copie ; recherche de valeurs dupliquées | CT-90, CT-119 |
| ENF-20 | 2 heures sans arrêt ; 50 pauses/reprises ; 20 sauvegardes/restaurations | endurance automatisée à horloge accélérée ; session de 2 heures sur S22 | CT-89, CT-101 |

### 3.3 Exigences de sécurité
| Exigence | Test de vérification | Cas de test |
|---|---|---|
| EXS-01 | aucun secret dans le code ni l'historique ; `.gitignore` ; workflows sans secret | CT-74, CT-122 |
| EXS-02 | zéro requête hors origine locale ; `connect-src 'none'` ; règles interdisant `fetch` et URL absolues | CT-65, CT-70, CT-71, CT-95 |
| EXS-03 | aucune API sensible appelée, aucune invite ; règles ESLint ; manifeste sans permission | CT-71, CT-73, CT-93 |
| EXS-04 | corpus piégé et mutations refusés (E-01, E-02), taille de 256 Kio contrôlée avant lecture | CT-40, CT-55, CT-57, CT-118, CT-125 |
| EXS-05 | `Object.prototype` inchangé après import ; échec ou arrêt pendant la fusion : état antérieur ; skins jamais retirés | CT-56, CT-71 |
| EXS-06 | nom `<img src=x onerror=alert(1)>` affiché littéralement ; règles contre `innerHTML` et `eval` | CT-40, CT-71 |
| EXS-07 | balise CSP conforme, aucune violation, aucun script en ligne, refus en cadre, aucun cookie | CT-72 |
| EXS-08 | agent de service seulement en contexte sécurisé, cache de l'origine avec empreintes, TLS de l'adresse publiée | CT-64, CT-66, CT-67, CT-76, CT-81, CT-120 |
| EXS-09 | archive, `SHA256SUMS` et SBOM rejouables ; somme fausse détectée ; aucun `curl | sh` | CT-77, CT-81 |
| EXS-10 | aucune dépendance à l'exécution, versions exactes, verrou avec empreintes, audit | CT-63, CT-75, CT-124 |
| EXS-11 | permissions minimales, actions épinglées, aucun `pull_request_target` | CT-74, CT-76, CT-124 |
| EXS-12 | chaque erreur : message français, code, aucune trace, console vide | CT-51, CT-55, CT-71, CT-79, CT-116, CT-118 |
| EXS-13 | stockage privé, fichier exactement au schéma, nom de fichier importé ignoré | CT-50, CT-80 |
| EXS-14 | `storage.persist()` demandé à chaque lancement tant que non accordé ; aucune suppression de fichier | CT-68, CT-80, CT-95, CT-101 |
| EXS-15 | relecture de `SECURITY.md` et du guide d'exploitation | CT-68, CT-77, CT-78, CT-91, CT-122, CT-123 |
| EXS-16 | publication par étiquette depuis la CI seule ; mise à jour sur consentement ; code externe bloqué | CT-66, CT-67, CT-76, CT-81, CT-103, CT-120, CT-123, CT-124 |
| EXS-17 | 100 000 crochets imbriqués, chaînes mal formées, marques bidirectionnelles, `?seed=` hors format ignoré, manifeste sans entrée, messages inconnus à l'agent de service sans effet | CT-118, CT-119, CT-120 |
| EXS-18 | chemins hors de `dist/` en 404, `Host` inconnu en 421, méthodes autres que GET et HEAD refusées, écoute sur 127.0.0.1 | CT-121 |
| EXS-19 | liste de contrôle du guide, `SECURITY.md`, historique sans adresse personnelle ; réglages réels vérifiés par `gh api` | CT-122, CT-123 |
| EXS-20 | `ignore-scripts`, cooldown Dependabot, étiquette issue de `main`, artefact Pages égal à la liste pré-cachée | CT-124 |

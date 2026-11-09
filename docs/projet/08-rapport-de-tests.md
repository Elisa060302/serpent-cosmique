# Rapport de tests — Serpent Cosmique v1.0.0

## 1. Synthèse
| Indicateur | Valeur |
|---|---|
| Cas de test exécutés | 107 / 125 (réverification du 2026-11-08, corrections reçues) |
| Passés | 107 (CT-08, CT-89 et CT-111 compris, sans réserve) |
| En échec | 0 |
| Bloqués ou non exécutés | 18 : CT-69, 81, 93 à 103, 112 à 115, 123 (appareils réels, WebKit, publication réelle, dépôt réel : à jouer en recette par le demandeur, HYP-41) |
| Couverture de code (lignes) | 99,64 % sur `src/core` (seuil 80 %) ; branches 95,69 % ; fonctions 99,44 % |
| Tests automatisés | 567 unitaires réussis sur 567 ; 558 tests d'acceptation Playwright réussis sur 558 (Chromium, profils « Android paysage » et « iPhone SE paysage »), sans échec attendu ni test ignoré par erreur (lancement complet sur copie propre du dépôt, 19,7 min) |
| Environnement | Linux x86_64, Node.js 22.23.4, npm 10.9.9, Playwright 1.63.0, Chromium révision 1243, copie propre du dépôt dans un dossier temporaire vierge ; WebKit, Firefox et téléphones absents |
| Verdict | APPROUVE, avec réserves : aucune anomalie ouverte ; les 14 CT de priorité haute non exécutés (téléphones, publication réelle, dépôt réel) et les 4 de priorité moyenne restent à jouer par le demandeur (HYP-41) |

Commandes : `npm run test:e2e` (construction puis `playwright test`) et `npm test` sur la copie propre du dépôt ; un CT se rejoue seul avec `npx playwright test -g "ct_NN_"`.

## 2. Résultats par cas de test
| CT | Résultat (PASSÉ, ÉCHEC, BLOQUÉ, NON EXÉCUTÉ) | Preuve (test automatisé, commande et sortie) | Anomalie |
|---|---|---|---|
| CT-01 — Menu principal et lancement d'une partie en deux touchers | PASSÉ | Playwright : 8 test(s) réussi(s) (classique.spec.ts, socle.spec.ts) |  |
| CT-02 — Liste des modes et règles en deux phrases | PASSÉ | Playwright : 4 test(s) réussi(s) (classique.spec.ts, modes.spec.ts) |  |
| CT-03 — Mode surprise verrouillé : aucune partie ne démarre | PASSÉ | Playwright : 8 test(s) réussi(s) (modes.spec.ts) |  |
| CT-04 — Départ de partie : serpent rose de 4 cases, compte à rebours, pas réguliers | PASSÉ | Playwright : 8 test(s) réussi(s) (classique.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-05 — Un bonbon mangé fait grandir le serpent et augmente le score | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-06 — Collision contre un bord : fin 1 s après | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 2 test(s) réussi(s) |  |
| CT-07 — La case que la queue quitte est libre | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-08 — Victoire quand l'aire de jeu est pleine | PASSÉ | `ct_08_victoire_aire_pleine` : moteur (2 tests unitaires : 288 cases, 284 points en Classique) et navigateur (Zen, profil Android paysage, 3 exécutions sur 3 réussies, 4,5 min chacune : 288 cases occupées, « Victoire ! L'aire de jeu est pleine. », score affiché et retenu au tableau Zen, tête et score contrôlés tous les 20 bonbons). Critère aligné par la décision de l'équipe projet (07 v1.4) : en Zen le corps se traverse, le cas exact 284 points n'existe qu'en Classique | |
| CT-09 — L'écran reste allumé pendant la partie | PASSÉ | Playwright : 8 test(s) réussi(s) (interruptions.spec.ts, modes.spec.ts); unitaire : 8 test(s) réussi(s) |  |
| CT-10 — Orientation horizontale et message en position verticale | PASSÉ | Playwright : 4 test(s) réussi(s) (classique.spec.ts) |  |
| CT-11 — Commande par glissement : seuil de 5 mm, une commande par contact | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 6 test(s) réussi(s) |  |
| CT-12 — Toucher bref, glissement trop court et diagonale | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 4 test(s) réussi(s) |  |
| CT-13 — Commande par flèches : taille, position, retour visuel | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts) |  |
| CT-14 — En mode Flèches, les glissements sont ignorés | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts) |  |
| CT-15 — File de commandes de 2 au plus, dans l'ordre | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-16 — Demi-tour et répétition ignorés, dans tous les modes | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 5 test(s) réussi(s) |  |
| CT-17 — Commande pendant le compte à rebours et file vidée à la pause | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts) |  |
| CT-18 — Quatre couleurs de bonbons, tirage équilibré et placement valide (acceptation moteur) | PASSÉ | unitaire : 5 test(s) réussi(s) |  |
| CT-19 — Le serpent prend la couleur du dernier bonbon et repart rose | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 4 test(s) réussi(s) |  |
| CT-20 — Arc-en-ciel à chaque dizaine de bonbons | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 9 test(s) réussi(s) |  |
| CT-21 — Silhouettes distinctes et contrastes sur les quatre décors | PASSÉ | Playwright : 10 test(s) réussi(s) (skins.spec.ts); unitaire : 21 test(s) réussi(s) |  |
| CT-22 — Mode Classique : vitesse 6 c/s + 0,2 par bonbon, plafond 12 c/s | PASSÉ | unitaire : 3 test(s) réussi(s) |  |
| CT-23 — Mode Classique : collision avec la queue et écran de fin | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 2 test(s) réussi(s) |  |
| CT-24 — Scénario SCN-01 : première partie hors ligne, record « Coco » | PASSÉ | Playwright : 2 test(s) réussi(s) (progression.spec.ts) |  |
| CT-25 — Contre la montre : 60 secondes, 3 bonbons en permanence | PASSÉ | Playwright : 4 test(s) réussi(s) (modes.spec.ts); unitaire : 9 test(s) réussi(s) |  |
| CT-26 — Contre la montre : pause d'un appel, reprise, collision à 20 s | PASSÉ | Playwright : 4 test(s) réussi(s) (modes.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-27 — Champ d'astéroïdes : 3 au départ, +1 tous les 5 bonbons, 30 au plus | PASSÉ | unitaire : 4 test(s) réussi(s) |  |
| CT-28 — Champ d'astéroïdes : placement valide et collision | PASSÉ | Playwright : 4 test(s) réussi(s) (modes.spec.ts); unitaire : 4 test(s) réussi(s) |  |
| CT-29 — Trou noir : placement des paires, téléportation, collision à la sortie | PASSÉ | Playwright : 2 test(s) réussi(s) (modes.spec.ts); unitaire : 10 test(s) réussi(s) |  |
| CT-30 — Bonus et pièges : effets Inversion, Ralenti, Turbo, Rétrécissement | PASSÉ | Playwright : 4 test(s) réussi(s) (modes.spec.ts); unitaire : 10 test(s) réussi(s) |  |
| CT-31 — Bonus et pièges : apparition tous les 3 bonbons, disparition après 8 s de jeu | PASSÉ | Playwright : 2 test(s) réussi(s) (modes.spec.ts); unitaire : 5 test(s) réussi(s) |  |
| CT-32 — Mode Zen : traversée des bords et du corps, abandon et score | PASSÉ | Playwright : 4 test(s) réussi(s) (modes.spec.ts); unitaire : 10 test(s) réussi(s) |  |
| CT-33 — Constellation : suite de couleurs, points et bonbons permanents | PASSÉ | Playwright : 6 test(s) réussi(s) (modes.spec.ts, skins.spec.ts); unitaire : 9 test(s) réussi(s) |  |
| CT-34 — Découverte du mode surprise à la 3e partie | PASSÉ | Playwright : 4 test(s) réussi(s) (modes.spec.ts); unitaire : 6 test(s) réussi(s) |  |
| CT-35 — Écran de fin : raisons, Rejouer, Menu | PASSÉ | Playwright : 8 test(s) réussi(s) (classique.spec.ts, progression.spec.ts) |  |
| CT-36 — Compteurs enregistrés avant l'écran de fin, même après fermeture forcée | PASSÉ | Playwright : 4 test(s) réussi(s) (progression.spec.ts); unitaire : 4 test(s) réussi(s) |  |
| CT-37 — Tableaux des records : un par mode, tri, vide | PASSÉ | Playwright : 6 test(s) réussi(s) (progression.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-38 — Entrée au tableau : égalité avec le 10e, zéro point | PASSÉ | Playwright : 2 test(s) réussi(s) (progression.spec.ts); unitaire : 11 test(s) réussi(s) |  |
| CT-39 — Saisie du nom : prérempli, validation, champ vide | PASSÉ | Playwright : 18 test(s) réussi(s) (progression.spec.ts); unitaire : 14 test(s) réussi(s) |  |
| CT-40 — Nom : 12 caractères, caractères spéciaux, injection | PASSÉ | Playwright : 8 test(s) réussi(s) (progression.spec.ts) |  |
| CT-41 — Record conservé si le jeu est fermé pendant la saisie du nom | PASSÉ | Playwright : 2 test(s) réussi(s) (progression.spec.ts) |  |
| CT-42 — Skins au premier lancement : catalogue de 16, 4 par défaut | PASSÉ | Playwright : 6 test(s) réussi(s) (progression.spec.ts, skins.spec.ts); unitaire : 7 test(s) réussi(s) |  |
| CT-43 — Déblocage des skins : seuils, annonce, abandon compris | PASSÉ | Playwright : 4 test(s) réussi(s) (progression.spec.ts); unitaire : 20 test(s) réussi(s) |  |
| CT-44 — Un skin débloqué le reste après une restauration | PASSÉ | Playwright : 2 test(s) réussi(s) (skins.spec.ts); unitaire : 5 test(s) réussi(s) |  |
| CT-45 — Choix et retrait d'un skin, skin verrouillé refusé | PASSÉ | Playwright : 52 test(s) réussi(s) (skins.spec.ts); unitaire : 39 test(s) réussi(s) |  |
| CT-46 — Réglages : valeurs par défaut, conservation, À propos | PASSÉ | Playwright : 12 test(s) réussi(s) (reglages.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-47 — Vibrations indisponibles sur le téléphone | PASSÉ | Playwright : 2 test(s) réussi(s) (reglages.spec.ts) |  |
| CT-48 — Bruitages, musique et vibrations suivent leur réglage | PASSÉ | Playwright : 12 test(s) réussi(s) (reglages.spec.ts); unitaire : 21 test(s) réussi(s) |  |
| CT-49 — Aucun son ni vibration hors du premier plan | PASSÉ | Playwright : 4 test(s) réussi(s) (interruptions.spec.ts) |  |
| CT-50 — Création d'une sauvegarde : nom, message, contenu, doublon | PASSÉ | Playwright : 10 test(s) réussi(s) (sauvegarde.spec.ts); unitaire : 6 test(s) réussi(s) |  |
| CT-51 — Échec d'écriture de la sauvegarde : E-03, E-04, annulation, remplacement confirmé ou refusé | PASSÉ | Playwright : 10 test(s) réussi(s) (sauvegarde.spec.ts) |  |
| CT-52 — Restauration sur un autre téléphone (SCN-04) | PASSÉ | Playwright : 2 test(s) réussi(s) (sauvegarde.spec.ts) |  |
| CT-53 — Règles de fusion : records, compteurs, idempotence | PASSÉ | Playwright : 6 test(s) réussi(s) (sauvegarde.spec.ts); unitaire : 7 test(s) réussi(s) |  |
| CT-54 — Restauration annulée : rien n'est modifié | PASSÉ | Playwright : 2 test(s) réussi(s) (sauvegarde.spec.ts) |  |
| CT-55 — Fichiers invalides refusés : E-01 et E-02 | PASSÉ | Playwright : 2 test(s) réussi(s) (securite.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-56 — Fusion atomique et sans pollution d'objets | PASSÉ | Playwright : 2 test(s) réussi(s) (securite.spec.ts); unitaire : 5 test(s) réussi(s) |  |
| CT-57 — Taille maximale du fichier importé (256 Kio) et mutations | PASSÉ | Playwright : 4 test(s) réussi(s) (securite.spec.ts); unitaire : 3 test(s) réussi(s) |  |
| CT-58 — Données maximales : fichier de 50 Ko, 2 s, 3 s | PASSÉ | Playwright : 2 test(s) réussi(s) (sauvegarde.spec.ts); unitaire : 2 test(s) réussi(s) |  |
| CT-59 — Pause manuelle, reprise après 3 s, abandon confirmé | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts) |  |
| CT-60 — Bouton retour du téléphone : pause sans quitter le jeu | PASSÉ | Playwright : 10 test(s) réussi(s) (classique.spec.ts) |  |
| CT-61 — Pause automatique : interruptions, volet, verrouillage, appel | PASSÉ | Playwright : 20 test(s) réussi(s) (interruptions.spec.ts); unitaire : 7 test(s) réussi(s) |  |
| CT-62 — Partie interrompue par la fermeture du jeu | PASSÉ | Playwright : 22 test(s) réussi(s) (modes.spec.ts, progression.spec.ts); unitaire : 22 test(s) réussi(s) |  |
| CT-63 — Installation propre depuis une copie propre du dépôt, en suivant le guide | PASSÉ | procédure manuelle sur la copie propre du dépôt : voir § 4 (npm ci, lint, typecheck, test, build, test:e2e) ; autonomie du dépôt : vérification de CT-63 (étape 2) sans constat ; guide : 3 étapes par système, aucun `curl | sh` |  |
| CT-64 — Application installable et prête hors ligne (navigateur de bureau, sous-dossier compris) | PASSÉ | Playwright : 10 test(s) réussi(s) (installation.spec.ts) |  |
| CT-65 — Fonctionnement hors ligne après redémarrage | PASSÉ | Playwright : 2 test(s) réussi(s) (installation.spec.ts) |  |
| CT-66 — Mise à jour proposée, jamais imposée, progression conservée (EF-29) | PASSÉ | Playwright : 2 test(s) réussi(s) (installation.spec.ts); unitaire : 4 test(s) réussi(s) |  |
| CT-67 — Mise à jour impossible : empreinte fausse ou connexion coupée (E-06) | PASSÉ | Playwright : 8 test(s) réussi(s) (installation.spec.ts) ; incident I-01 clos (§ 3) |  |
| CT-68 — Désinstallation et effacement des données | PASSÉ | Playwright : 2 test(s) réussi(s) (installation.spec.ts) |  |
| CT-69 — Suite d'acceptation sur WebKit et profils de téléphones | NON EXÉCUTÉ | WebKit absent du poste (seul Chromium 1243 est installé) ; la CI exécute les projets WebKit |  |
| CT-70 — Aucune requête réseau pendant l'exécution du jeu | PASSÉ | Playwright : 2 test(s) réussi(s) (installation.spec.ts) |  |
| CT-71 — Analyse statique : constructions interdites, URL absolues, secrets applicatifs | PASSÉ | unitaire : 34 test(s) réussi(s) |  |
| CT-72 — Politique de sécurité du contenu, cadre, cookies et indexation | PASSÉ | Playwright : 6 test(s) réussi(s) (socle.spec.ts) |  |
| CT-73 — Aucune permission ni API sensible sollicitée | PASSÉ | unitaire : 9 test(s) réussi(s) |  |
| CT-74 — Aucun secret dans le dépôt et son historique | PASSÉ | Playwright : 2 test(s) réussi(s) (depot.spec.ts) |  |
| CT-75 — Dépendances : aucune à l'exécution, versions épinglées, verrou avec empreintes | PASSÉ | Playwright : 2 test(s) réussi(s) (depot.spec.ts) |  |
| CT-76 — Intégration continue et publication : droits minimaux et déclencheurs | PASSÉ | unitaire : 10 test(s) réussi(s) ; un test erroné a échoué à la 1re exécution (ANO-01), corrigé et vérifié | ANO-01 |
| CT-77 — Artefacts d'une version : archive, SHA256SUMS, SBOM | PASSÉ | Playwright : 4 test(s) réussi(s) (depot.spec.ts) |  |
| CT-78 — SECURITY.md et guide d'exploitation | PASSÉ | `ct_78_documentation_securite` (10 points de SECURITY.md et du guide d'exploitation, E-01 à E-08 du guide de l'utilisateur) ; relecture de fond limitée à SECURITY.md et au guide d'installation (§ 5) |  |
| CT-79 — Chaque erreur présentée au joueur : message français, code, aucune trace (E-01 à E-08) | PASSÉ | Playwright : 14 test(s) réussi(s) (progression.spec.ts) |  |
| CT-80 — Stockage privé, minimisation et persistance demandée | PASSÉ | Playwright : 2 test(s) réussi(s) (progression.spec.ts) |  |
| CT-81 — Adresse publiée : HTTPS, certificat et artefacts réels | NON EXÉCUTÉ | aucune publication réelle n'a eu lieu : adresse, certificat et artefacts réels inexistants ; à jouer après la première publication |  |
| CT-82 — Grille entièrement visible, cases et zones sûres sur la gamme d'écrans | PASSÉ | Playwright : 2 test(s) réussi(s) (classique.spec.ts); unitaire : 13 test(s) réussi(s) |  |
| CT-83 — Temps de démarrage et de navigation (mesure indicative sur poste) | PASSÉ | Playwright : 4 test(s) réussi(s) (classique.spec.ts, qualite.spec.ts) |  |
| CT-84 — Régularité des pas et fluidité d'affichage (mesure indicative sur poste) | PASSÉ | Playwright : 2 test(s) réussi(s) (qualite.spec.ts); unitaire : 20 test(s) réussi(s) |  |
| CT-85 — Réactivité des commandes | PASSÉ | Playwright : 6 test(s) réussi(s) (commandes.spec.ts) |  |
| CT-86 — 20 arrêts brutaux : aucune perte, écriture jamais incomplète | PASSÉ | Playwright : 2 test(s) réussi(s) (securite.spec.ts) |  |
| CT-87 — Textes en français, dates et nombres au format français | PASSÉ | Playwright : 2 test(s) réussi(s) (qualite.spec.ts) |  |
| CT-88 — Zones tactiles, tailles de texte, clignotements, jeu complet aux flèches | PASSÉ | Playwright : 8 test(s) réussi(s) (accessibilite.spec.ts) |  |
| CT-89 — Endurance automatisée : pauses, sauvegardes et parties enchaînées | PASSÉ | `ct_89_endurance_automatisee` (Chromium, 2 profils, 97 s) : 50 pauses, 20 sauvegardes suivies de restaurations, une partie de chaque mode, aucune erreur de page ni plantage ; mémoire +43,5 % (seuil 50 %) ; `ct_89_endurance_modes` (moteur, 2 tests unitaires) | |
| CT-90 — Aléa reproductible et valeurs des règles à un seul endroit | PASSÉ | unitaire : 27 test(s) réussi(s) |  |
| CT-91 — Guides et documentation : exactitude et complétude | PASSÉ | guide d'installation relu (3 étapes Android, 3 étapes iPhone, aucun `curl | sh`) ; recherches de CT-91 (étapes 3 et 4) : aucun constat ; auteur de l'historique du dépôt : CocoClaudo | ANO-03 (vérifiée) |
| CT-92 — Écrans en DOM : parcours au clavier, focus visible, noms accessibles | PASSÉ | Playwright : 6 test(s) réussi(s) (accessibilite.spec.ts) |  |
| CT-93 — Installation sur Android (Samsung Galaxy S22), chronométrée | NON EXÉCUTÉ | aucun téléphone Android : à jouer par le demandeur (HYP-41) |  |
| CT-94 — Installation sur iPhone (Safari, iOS 17 ou ultérieur), chronométrée | NON EXÉCUTÉ | aucun iPhone : à jouer par le demandeur (HYP-41) |  |
| CT-95 — Mode avion, redémarrage et 7 jours sans échange | NON EXÉCUTÉ | aucun téléphone ; mode avion et 7 jours sans échange : à jouer par le demandeur (HYP-41) |  |
| CT-96 — Interruptions réelles, rotation, veille | NON EXÉCUTÉ | aucun téléphone : interruptions réelles, rotation, veille (HYP-41) |  |
| CT-97 — Mesures physiques : cases, zones tactiles, texte, seuil de glissement | NON EXÉCUTÉ | aucun téléphone : mesures à la règle sur appareil (HYP-41) |  |
| CT-98 — Performance sur S22 : démarrage, fluidité, réactivité, serpent de 280 cases | NON EXÉCUTÉ | aucun S22 ni caméra haute fréquence (HYP-41) |  |
| CT-99 — Sons, musique et vibrations réels | NON EXÉCUTÉ | aucun téléphone : sons, musique et vibrations réels (HYP-41) |  |
| CT-100 — Prise en main et lisibilité par trois personnes | NON EXÉCUTÉ | nécessite trois personnes extérieures à l'équipe projet (HYP-41) |  |
| CT-101 — Endurance sur S22 : 2 heures, cycles de pause et de sauvegarde, arrêts brutaux | NON EXÉCUTÉ | aucun S22 : 2 heures de jeu réelles (HYP-41) |  |
| CT-102 — Transfert de la progression entre deux téléphones (SCN-04) | NON EXÉCUTÉ | nécessite deux téléphones (HYP-41) |  |
| CT-103 — Mise à jour réelle d'une version à la suivante sur téléphone | NON EXÉCUTÉ | nécessite deux versions publiées et un téléphone ; seul le contrôle du numéro de version est automatisé (unitaire, réussi) |  |
| CT-104 — Mise à jour : rien pendant une partie, rien en mode avion | PASSÉ | Playwright : 10 test(s) réussi(s) (installation.spec.ts) |  |
| CT-105 — Panneau « Installer le jeu » dans le navigateur | PASSÉ | Playwright : 8 test(s) réussi(s) (installation.spec.ts) |  |
| CT-106 — Textes de référence de 05 et 02 présents, exacts, en français | PASSÉ | unitaire : 19 test(s) réussi(s) |  |
| CT-107 — Charte de couleurs : contrastes calculés et valeurs réellement appliquées | PASSÉ | Playwright : 2 test(s) réussi(s) (accessibilite.spec.ts); unitaire : 4 test(s) réussi(s) |  |
| CT-108 — Focus, dialogues et touche Échap | PASSÉ | Playwright : 4 test(s) réussi(s) (classique.spec.ts) |  |
| CT-109 — Rôles, noms accessibles et état non porté par la couleur seule | PASSÉ | Playwright : 4 test(s) réussi(s) (installation.spec.ts, reglages.spec.ts) |  |
| CT-110 — Mouvement réduit et clignotements | PASSÉ | Playwright : 6 test(s) réussi(s) (skins.spec.ts); unitaire : 5 test(s) réussi(s) |  |
| CT-111 — Écrans hors partie défilables, texte agrandi à 200 % | PASSÉ | `ct_111_defilement_et_zoom` : tous les tests réussis, y compris « Valider » visible en même temps que le champ à 180 px (assertion que la recette a ajoutée pour vérifier ANO-02) et l'écran de fin à 200 % ; 5 répétitions × 2 profils sans échec | ANO-02 (vérifiée) |
| CT-112 — Ergonomie des flèches et taille des cases sur le plus petit écran | NON EXÉCUTÉ | nécessite un iPhone SE 3 et 3 personnes (HYP-41) |  |
| CT-113 — Défilement des écrans sur appareil réel | NON EXÉCUTÉ | aucun appareil réel (HYP-41) |  |
| CT-114 — Clavier du téléphone en paysage sur l'écran de fin | NON EXÉCUTÉ | aucun clavier de téléphone réel (HYP-41) ; simulation par hauteur réduite : voir CT-111 |  |
| CT-115 — Panneau « Installer le jeu » et mise à jour sur appareil réel | NON EXÉCUTÉ | deux versions publiées et appareils réels (HYP-41) |  |
| CT-116 — Restauration impossible à enregistrer : E-07 | PASSÉ | Playwright : 4 test(s) réussi(s) (sauvegarde.spec.ts) |  |
| CT-117 — Analyse automatique d'accessibilité (axe-core) sur chaque écran | PASSÉ | Playwright : 38 test(s) réussi(s) (classique.spec.ts, modes.spec.ts, progression.spec.ts, sauvegarde.spec.ts, skins.spec.ts, socle.spec.ts) |  |
| CT-118 — Validateur : imbrication, chaînes mal formées, marques bidirectionnelles, types d'objets | PASSÉ | Playwright : 2 test(s) réussi(s) (securite.spec.ts); unitaire : 96 test(s) réussi(s) |  |
| CT-119 — Paramètre d'adresse ?seed= : analyse stricte, aucun autre point d'entrée | PASSÉ | Playwright : 4 test(s) réussi(s) (classique.spec.ts, socle.spec.ts); unitaire : 33 test(s) réussi(s) |  |
| CT-120 — Manifeste sans entrée supplémentaire, agent de service restreint | PASSÉ | Playwright : 2 test(s) réussi(s) (socle.spec.ts); unitaire : 6 test(s) réussi(s) |  |
| CT-121 — Serveur local de développement : confinement, Host, méthodes, écoute | PASSÉ | Playwright : 16 test(s) réussi(s) (serveur.spec.ts) |  |
| CT-122 — Dépôt public : liste de contrôle, adresse de commit, aucune donnée personnelle | PASSÉ | unitaire : 9 test(s) réussi(s) |  |
| CT-123 — Réglages réels du dépôt et du compte avant la première publication | NON EXÉCUTÉ | réglages réels du dépôt et du compte (`gh api`) : le dépôt n'existe pas avant la première publication |  |
| CT-124 — Construction et workflows durcis : scripts npm, cooldown, étiquette issue de main, artefact limité | PASSÉ | unitaire : 25 test(s) réussi(s) |  |
| CT-125 — Contrôle des dates : tolérée en local, stricte à l'import | PASSÉ | Playwright : 2 test(s) réussi(s) (progression.spec.ts); unitaire : 9 test(s) réussi(s) |  |

Tests d'acceptation écrits pendant cette exécution (CT sans test jusque-là) : `ct_68`, `ct_70` (installation.spec.ts) ; `ct_74`, `ct_75`, `ct_78` (depot.spec.ts) ; `ct_83` (démarrage), `ct_84` (navigateur), `ct_87` (qualite.spec.ts) ; `ct_85` (commandes.spec.ts) ; `ct_86` (securite.spec.ts) ; `ct_88`, `ct_92`, `ct_107` (contrastes appliqués), `ct_111` (accessibilite.spec.ts). Le fichier 07 a reçu uniquement les noms de ces tests.

Mesures relevées : CT-83 (processeur ralenti 4 fois, 5 mesures) démarrage 293 à 431 ms (seuil 3 s), changement d'écran 106 à 180 ms (0,5 s), lancement 144 à 271 ms (1 s). CT-84 : 60 images par seconde, 178 à 179 pas, 97,8 % des intervalles à ± 10 %, plus long 183 ms (limite 333 ms). CT-85 : 20 commandes sur 20 appliquées au pas suivant, au glissement et aux flèches ; retour visuel des flèches mesuré sur un événement synthétique (délai du gestionnaire, bien inférieur à 100 ms). CT-86 : 20 arrêts par SIGKILL réussis ; 4 écritures sur 10 faites juste avant un arrêt immédiat n'ont pas été retrouvées (état « d'avant », admis par le CT) ; aucune écriture incomplète, E-05 jamais affichée.

## 3. Anomalies
| ANO | Sévérité | CT | Description | Reproduction | Attendu / obtenu | Statut (ouverte, corrigée, vérifiée) |
|---|---|---|---|---|---|---|
| ANO-01 | MINEURE | CT-76, CT-124 | Test unitaire de `publication.test.ts` erroné : l'expression interdisant tout cache dans `release.yml` reconnaissait aussi `package-manager-cache: false`, réglage qui désactive le cache | `npm test` : 564 réussis sur 565 | Attendu : le test réussit, `release.yml` n'utilisant aucun cache. Obtenu : échec. Le workflow est conforme, c'est le test qui était faux : il a été corrigé par la recette (seule cette mention est tolérée) | vérifiée : `npm test` 567 sur 567 ; le test corrigé ignore seulement `package-manager-cache: false` et reste en échec sur toute autre mention de cache (relu) |
| ANO-02 | MINEURE | CT-111 | Écran de fin à 180 px de hauteur : « Valider » sous le champ « Votre nom », visible seulement par défilement | `npx playwright test -g "ct_111_"` | Attendu (07) : champ et « Valider » visibles ensemble. Corrigé par le développeur (CSS : « Valider » sur la même ligne que le champ ; « Valider » passe sous le champ à texte très agrandi). Vérifié de façon indépendante : assertion « Valider » entièrement visible sans défilement ajoutée par la recette, plus l'écran de fin à 200 % (rien coupé) ; 5 répétitions sur 2 profils, puis suite complète : sans échec | vérifiée |
| ANO-03 | COSMÉTIQUE | CT-91 | `CHANGELOG.md` ne citait pas le titulaire des droits | lecture du fichier | Attendu : titulaire désigné. Obtenu après correction : « © 2026 CocoClaudo, titulaire des droits. Licence MIT » en fin de CHANGELOG ; README et LICENSE inchangés | vérifiée |

Incident d'exécution I-01 (clos, pas une anomalie du produit) : lors du premier lancement complet, `ct_67_mise_a_jour_echec` (installation.spec.ts:600) a échoué sur « ENOENT » pendant la copie de `dist/` dans `buildVersion`, échec observé aussi par l'audit de sécurité. Qualification : instabilité d'environnement (un `npm run build` concurrent supprime et recrée `dist/`), sans lien avec le jeu. Correction du développeur : `tests/acceptance/support/site.ts` copie `dist/` une seule fois par processus de test, avec nouvelle tentative si `dist/` disparaît pendant la copie (relu). Vérification : `ct_67` répété 5 fois sur 2 profils (110 tests réussis avec ct_111 et ct_87), suite complète sans échec ; le scénario d'une reconstruction concurrente de `dist/` n'a pas été rejoué volontairement. Le fait que `ct_87` dépendait de l'instant où apparaît le message passager « Prêt à jouer hors ligne » (instabilité du test, pas du jeu) est également corrigé : ce message, déjà vérifié par `ct_64`, est exclu du texte relevé ; `ct_87` répété 5 fois sur 2 profils sans échec.

## 4. Installation et non-régression
Installation propre (CT-63), à partir d'un clone du dépôt (199 fichiers suivis, un seul commit « Version 1.0.0 », auteur CocoClaudo) dans un dossier temporaire sans `node_modules`, en suivant `docs/guide-installation.md` :

| Étape | Commande | Résultat |
|---|---|---|
| 1 | `npm ci` | 105 paquets, 0 vulnérabilité, 2 s |
| 2 | `npm run lint` | eslint et prettier sans écart |
| 3 | `npm run typecheck` | réussi |
| 4 | `npm test` | 567 réussis sur 567 ; couverture `src/core` : 99,64 % |
| 5 | `npm run test:e2e` (construction puis Playwright), rejoué après les corrections (copie propre du dépôt neuve, étapes 1 à 5 refaites) | 558 réussis sur 558 (19,7 min) ; première exécution avant corrections : 550 réussis dont 2 échecs attendus |
| 6 | contrôle d'autonomie du dépôt (CT-63, étape 2 : `git ls-files`, recherche des chemins absolus, auteurs de `git log`) | aucun constat |

Le serveur local de `npm run serve` est celui que démarrent les tests (`ct_121`, 16 tests réussis) ; le menu principal s'ouvre dans Chromium (`ct_01`). Aucune étape du guide n'a été trouvée fausse ; le guide n'exige rien hors du dossier. Non-régression : après les corrections, suite complète rejouée sur copie propre du dépôt neuve (567 unitaires et 558 d'acceptation réussis) ; répétitions ciblées : `ct_08` 3 sur 3 (13,7 min), `ct_111`, `ct_87` et `ct_67` 5 fois sur 2 profils, `ct_89` 2 profils. Non exécutés ici : `gitleaks`, Semgrep avec le registre et `osv-scanner` (absents ou hôtes non joignables, ils tournent dans la CI) ; `npm audit` : 0 vulnérabilité (`npm ci`).

## 5. Limites des tests
- Téléphones, Safari iOS, WebKit, Firefox, installation sur l'écran d'accueil, vibrations, Wake Lock, appels, notifications et mesures en millimètres réels : non exécutables ici (CT-69, 93 à 99, 101 à 103, 112 à 115) ; les seuils en millimètres sont vérifiés avec la constante du jeu (6,3 px par mm, HYP-40) et les profils d'appareils émulés.
- Publication réelle (CT-81, CT-123) : aucun dépôt ni adresse publiés ; HTTPS, certificat, artefacts réels et réglages du compte à vérifier avant et après la première publication. Personnes (CT-100) : non réalisable par la recette interne.
- CT-08 : la variante navigateur est jouée en Zen (corps traversable, plus de 288 anneaux) ; le cas exact 288 cases / 284 points n'est vérifié que sur le moteur, en Classique (décision de l'équipe projet, 07 v1.4). Le test dure environ 4,5 min et ne tourne que sur le profil Android sous Chromium. CT-89 : la mesure de mémoire (+43,5 % pour 50 % tolérés) laisse une marge faible ; elle lit le tas JavaScript de Chromium et ne dit rien de la mémoire d'un téléphone (CT-101).
- CT-85 : le retour visuel des flèches est mesuré sur un événement synthétique, pas sur un vrai toucher (la mesure sur appareil fait foi, CT-98). CT-83 et CT-84 : mesures indicatives sur poste, avec Chromium sans accélération graphique particulière ; la marge de CT-84 (97,8 % pour 95 % exigés) peut se réduire sur une machine chargée.
- CT-86 : l'arrêt brutal tue le processus principal de Chromium (Linux, lecture de `/proc`) ; ce n'est pas la fermeture forcée d'un téléphone.
- CT-78 et CT-91 : la présence des points est vérifiée par recherche de mots-clés ; l'exactitude de fond n'a été relue que pour SECURITY.md et le guide d'installation, pas pour le guide d'exploitation ni le guide de l'utilisateur en entier.

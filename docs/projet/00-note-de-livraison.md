# Note de livraison — Serpent Cosmique v1.0.0

## En une phrase

Serpent Cosmique est votre jeu de serpent dans l'espace, avec des bonbons de quatre couleurs : il se joue à l'horizontale sur un téléphone Android ou un iPhone, s'installe sur l'écran d'accueil et fonctionne ensuite sans connexion.

## Ce que fait le jeu

- **Sept modes** : Classique, Contre la montre (60 secondes), Champ d'astéroïdes, Trou noir, Bonus et pièges, Zen (on ne perd jamais) et le mode surprise Constellation, qui se découvre après trois parties terminées.
- **Les couleurs** : le serpent est rose au départ, prend la couleur du dernier bonbon mangé (rose, violet, rose clair, bleu clair) et devient arc-en-ciel à chaque dizaine de bonbons.
- **Commandes** : au glissement du doigt ou avec des flèches à l'écran, au choix.
- **Pause** : bouton de pause, et pause automatique à chaque interruption (appel, notification, verrouillage, autre application).
- **Records** : un tableau des 10 meilleurs scores par mode, avec nom, score et date.
- **Skins** : 16 apparences à débloquer en jouant (formes, motifs, traînées, décors).
- **Réglages** : commande, bruitages, musique et vibrations, réglés séparément.
- **Sauvegarde** : la progression se range dans un fichier, qui se restaure sur le même téléphone ou sur un autre (les progressions sont fusionnées, rien n'est retiré).
- **Mises à jour** : jamais automatiques, elles s'installent seulement quand vous touchez « Installer » (Réglages, puis « À propos »).

Le jeu est en français, sans compte, sans publicité et gratuit.

## L'installer

Le jeu s'installe depuis un lien web, une seule fois, avec une connexion. Le lien sera `https://elisa060302.github.io/serpent-cosmique/` une fois le jeu publié sur votre compte GitHub (voir « Publier le jeu » plus bas). N'utilisez que ce lien.

**Android (Chrome), 3 étapes**
1. Touchez le lien officiel : il s'ouvre dans Chrome. Si votre téléphone propose un autre navigateur, choisissez Chrome.
2. Touchez le bouton **Installer le jeu** du menu du jeu, puis **Installer**. À défaut, touchez les trois points **⋮** en haut à droite de Chrome, puis **Installer l'application**.
3. Ouvrez le jeu depuis son icône sur l'écran d'accueil, **avec la connexion**, et attendez que « Prêt à jouer hors ligne » s'affiche (Réglages, puis « À propos »). Cela prend quelques secondes.

**iPhone (Safari), 3 étapes**
1. Ouvrez le lien officiel dans **Safari**.
2. Touchez **Partager** (le carré avec une flèche vers le haut), puis **Sur l'écran d'accueil**. Si vous ne voyez pas le bouton Partager, tenez un instant le téléphone à la verticale.
3. Touchez **Ajouter**, puis ouvrez le jeu depuis son icône **avec la connexion** et attendez « Prêt à jouer hors ligne » (Réglages, puis « À propos »). Sur iPhone, ce premier lancement connecté est indispensable.

Pour vérifier le mode sans réseau : activez le mode avion, fermez complètement le jeu, rouvrez-le depuis son icône. Détails et dépannage : `docs/guide-installation.md`. Sur iPhone, ne supprimez jamais l'icône pour « mettre à jour » : la progression serait effacée.

## Premiers pas

1. Ouvrez le jeu, touchez **Jouer**, puis **Classique**.
2. Après le compte à rebours, glissez le doigt n'importe où sur l'écran pour diriger le serpent, et mangez les bonbons.
3. À la fin, touchez **Rejouer** ou **Menu**. Si votre score entre au tableau, tapez votre nom puis **Valider**.
4. Pensez à créer une sauvegarde de temps en temps : Sauvegarde, puis « Créer une sauvegarde ».

Le guide complet (modes, déblocage des skins, records, messages d'erreur) est `docs/guide-utilisateur.md`.

## Ce qui a été vérifié

- **Tests** : 567 tests unitaires réussis sur 567 (couverture du moteur de jeu : 99,64 % des lignes, pour un seuil de 80 %) et 558 tests d'acceptation réussis sur 558 dans un navigateur, sur deux profils de téléphone en paysage (Android et iPhone SE). Sur 125 cas de test de la recette, 107 sont passés, 0 a échoué, 18 n'ont pas pu être joués faute de téléphones réels (voir « Ce qu'il vous reste à vérifier »). Les trois anomalies relevées (une erreur de test, un bouton « Valider » à faire défiler quand le clavier est affiché sur un très petit écran, une mention manquante dans le journal des modifications) sont corrigées.
- **Sécurité** : niveau de risque **faible** (un jeu local, aucun compte, un pseudonyme pour seule donnée personnelle, aucune donnée envoyée). L'audit est **approuvé** : aucune vulnérabilité critique, haute ou moyenne ; les trois constats corrigés (analyse automatique de la CI, formulation sur le rechargement forcé, ordre de publication) ; deux constats de faible gravité sont acceptés avec leur justification (noms invisibles possibles dans les records, outils de la CI téléchargés sans empreinte). Analyses exécutées : détection de secrets, analyse statique du code, audit des dépendances (0 vulnérabilité).
- **Recette interne** : décision **acceptée avec réserves** le 2026-11-09, après une première recette refusée pour des écarts de documentation, tous corrigés. Les 69 exigences ont chacune un lot et au moins un cas de test (matrice de traçabilité, `docs/projet/10-matrice-tracabilite.md`). Les réserves R-01 à R-06 sont à lever par vous (ci-dessous).

## Les choix techniques, et pourquoi

- **Forme** : un site web installable (PWA) plutôt qu'une application de magasin : un seul code pour Android et iPhone, aucun compte de développeur, aucun magasin.
- **Distribution** : publication sur GitHub Pages à partir de votre dépôt, gratuite, en HTTPS ; une version est publiée quand vous posez une étiquette `vX.Y.Z`, avec archive, sommes de contrôle et liste des composants.
- **Données** : tout reste sur le téléphone (base du navigateur), avec la version précédente gardée ; la sauvegarde par fichier est la protection contre une perte.
- **Aucune dépendance livrée** : le jeu n'embarque aucune bibliothèque tierce ; graphismes dessinés par le code, sons synthétisés, police du système.
- **Réseau** : le jeu n'envoie aucune donnée. À l'ouverture, avec une connexion, il vérifie seulement s'il existe une nouvelle version (moins de 10 Ko).

## Hypothèses à confirmer

L'équipe projet a fait des choix que vous avez validés pour la plupart (voir `docs/projet/01-expression-du-besoin.md`, § 9). À confirmer ou corriger après avoir joué :

- HYP-01 : l'arc-en-ciel dure jusqu'au bonbon suivant.
- HYP-02 : la restauration fusionne les progressions après confirmation ; un fichier abîmé est refusé sans rien modifier.
- HYP-03 : pause automatique en cas d'appel, de notification, de verrouillage ou de sortie de l'application.
- HYP-04 : pas de mise à jour automatique ; une nouvelle version s'installe à votre demande et conserve la progression.
- HYP-05 : règles fines (vitesses, durées des effets, détails des modes), apparence, catalogue de skins et conditions de déblocage laissés à l'équipe projet.
- HYP-06 : bruitages, musique et vibrations activés par défaut.
- HYP-07 : les amis ont un téléphone de moins de 5 ans, Android ou iPhone.
- HYP-32 : le code et l'adresse du jeu peuvent être publics une fois le projet dans votre propre dépôt (votre réponse du 2026-11-01).
- HYP-43 à HYP-51 : détails de comportement choisis par l'équipe projet : message clair si la restauration ou l'enregistrement échoue, déblocages d'une partie interrompue annoncés au lancement suivant, bouton retour du téléphone, nom du record, dates, fichier de sauvegarde jamais remplacé par le jeu lui-même, nombre de bonbons borné à 9 999.

## Ce qu'il vous reste à vérifier (réserves R-01 à R-06)

Les 18 cas de test suivants n'ont pas pu être joués : ils demandent des téléphones réels, le dépôt publié ou des personnes extérieures. Ils sont décrits pas à pas dans `docs/projet/07-cahier-de-recette.md` (§ 2). Procédure commune : installer la version publiée en suivant `docs/guide-installation.md` à la lettre, jouer chaque cas, noter pour chacun la date, l'appareil, le résultat (réussi ou échec) et les mesures, signaler tout écart, puis joindre ces fiches au rapport de tests (`docs/projet/08-rapport-de-tests.md`). Une réserve est levée quand ses cas sont réussis, ou que leurs écarts sont non bloquants et acceptés par vous.

| Réserve | Cas de test | Ce qu'il faut faire |
|---|---|---|
| R-01 | CT-69 | Au premier envoi sur `main`, vérifier que l'intégration continue du dépôt GitHub est verte, projets WebKit compris. |
| R-02 | CT-123, puis CT-81 | **Avant** la première étiquette : cocher les 13 cases de « Avant la première publication » du guide d'exploitation. Juste après : vérifier l'adresse publiée (réponse HTTP/2 200, certificat valide, HTTP redirigé vers HTTPS, `sha256sum --check SHA256SUMS` donne deux « OK »). |
| R-03 | CT-93, CT-94 | Installer le jeu sur votre Galaxy S22 (Chrome) puis sur un iPhone sous iOS 17 ou plus (Safari) : 3 étapes au plus, 10 minutes au plus, sans permission ni compte ; « Prêt à jouer hors ligne » ; une partie en mode avion ; moins de 50 Mo occupés. |
| R-04 | CT-95, CT-96, CT-97, CT-98, CT-102, CT-112, CT-114 ; CT-99, CT-101, CT-113 | Sur le S22 et un iPhone (idéalement un petit écran) : 7 jours de mode avion sans échange, pauses sur interruptions réelles (appel, verrouillage, rotation), mesures à la règle des cases et des flèches, fluidité et démarrage en 3 secondes, sons et vibrations, 2 heures de jeu, transfert de progression entre deux téléphones, clavier en paysage sur l'écran de fin. |
| R-05 | CT-100 | Faire essayer le jeu à trois personnes extérieures : chacune lance une partie en 30 secondes au plus, sans aide, et distingue correctement les couleurs de bonbon. |
| R-06 | CT-103, CT-115 | Avec la version 1.0.0 et une progression sur un téléphone, publier une version suivante (par exemple 1.0.1) : la mise à jour ne doit s'installer qu'au toucher de « Installer », la progression doit rester identique et le jeu utilisable en mode avion ensuite ; le panneau « Installer le jeu » doit être conforme sur Android et sur iPhone. |

La compatibilité avec Android 12 et iOS 17 (ENF-03) ne sera démontrée qu'après R-01 et R-03.

## Publier le jeu sur votre compte GitHub

1. Créez un dépôt **public** et **vide** nommé `serpent-cosmique` sur votre compte, envoyez-y le projet et laissez l'intégration continue se terminer (étapes détaillées dans `docs/guide-installation.md`, partie « Pour le mainteneur »).
2. Activez la **double authentification** du compte, et ne publiez **aucun autre site GitHub Pages** sur ce compte (sinon, utilisez une organisation gratuite dédiée).
3. Avant la première étiquette, vérifiez que l'intégration continue est verte sur le dépôt publié et déroulez les 13 cases de la liste de contrôle « Avant la première publication » de `docs/guide-exploitation.md` (réglages GitHub, protection de la branche et des étiquettes, signalement privé des vulnérabilités…).
4. Posez l'étiquette `v1.0.0` : le jeu est publié à l'adresse `https://elisa060302.github.io/serpent-cosmique/`. Contrôlez le certificat (TLS) et l'adresse, puis envoyez ce lien, et lui seul, à vos amis.

## Limites connues

- **Aucun téléphone n'a servi aux tests** : tout ce qui touche l'appareil réel (installation, vibrations, interruptions réelles, mesures physiques, fluidité sur le S22) reste à vérifier par vous (R-03 et R-04).
- **iPhone** : pas de vibrations, et le jeu ne peut pas forcer l'orientation : il demande de tourner le téléphone. Sur un iPhone dont iOS est antérieur à 18.4, l'écran peut se mettre en veille pendant une partie ; la partie passe alors en pause sans perte.
- **Rechargement forcé sur ordinateur** : un rechargement forcé (Maj + rechargement) charge la dernière version publiée sans passer par votre consentement. Cela ne concerne pas le jeu installé sur téléphone et n'affecte pas la progression.
- **Sauvegarde non chiffrée** : le fichier contient les noms des records ; ne le partagez qu'avec des personnes de confiance et ne restaurez que vos propres fichiers.
- **Perte de données** : effacer les données du site ou supprimer l'icône sur iPhone efface la progression ; sans fichier de sauvegarde, elle est perdue.
- **Mise à jour et compte** : la protection contre une publication piégée repose sur la sécurité de votre compte GitHub (double authentification, branche et étiquettes protégées).
- **Cas mineur** : sur un très petit écran avec le clavier affiché, le bouton « Valider » du nom de record peut demander un défilement ; la touche « Terminé » du clavier valide aussi.
- Le jeu est en français et en paysage uniquement.

## Et ensuite ?

- Votre recette métier : jouez, installez le jeu sur vos téléphones et ceux de vos amis, puis levez les réserves ci-dessus.
- Évolutions possibles (non réalisées) : profils de joueurs séparés, autres langues, tenue verticale du téléphone, nouveaux modes ou skins.

## Où trouver les livrables

| Livrable | Fichier |
|---|---|
| Présentation du projet et commandes de développement | `README.md` |
| Guide d'installation | `docs/guide-installation.md` |
| Guide utilisateur | `docs/guide-utilisateur.md` |
| Guide d'exploitation (publication, liste de contrôle, sauvegarde, diagnostic) | `docs/guide-exploitation.md` |
| Sécurité | `SECURITY.md`, `docs/projet/04-analyse-de-risques.md`, `docs/projet/09-rapport-audit-securite.md` |
| Historique des versions | `CHANGELOG.md` |
| Licence (MIT, © CocoClaudo) | `LICENSE` |
| Dossier projet (besoin, spécifications, architecture, conception, plan) | `docs/projet/01-expression-du-besoin.md` à `docs/projet/06-plan-de-realisation.md` |
| Cahier de recette, rapport de tests, matrice de traçabilité, procès-verbal de recette | `docs/projet/07-cahier-de-recette.md`, `08-rapport-de-tests.md`, `10-matrice-tracabilite.md`, `11-pv-de-recette.md` |
| Revues de code | `docs/projet/revues/` |

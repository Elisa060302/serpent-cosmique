# Guide d'installation — Serpent Cosmique

Ce guide a deux parties : la première s'adresse au **joueur** (installer le jeu sur un téléphone), la seconde au **mainteneur** (publier le jeu pour que les joueurs puissent l'installer). L'annexe rend compte du test d'installation propre.

Serpent Cosmique n'est pas une application d'un magasin : c'est un jeu qu'on ouvre une fois à une adresse web, puis qu'on garde sur l'écran d'accueil. Après cette unique connexion, il fonctionne sans réseau. Il ne demande aucun compte, aucune permission et ne coûte rien.

## Pour le joueur

### Ce qu'il faut

| | Android (Samsung Galaxy S22 et autres) | iPhone |
|---|---|---|
| Téléphone | Android récent, moins de 5 ans | iPhone de moins de 5 ans |
| Application à utiliser | **Chrome** | **Safari** (l'application bleue avec une boussole) |
| Connexion | Wi-Fi ou données mobiles, **une seule fois** | idem |
| Place | quelques centaines de Ko (le jeu), plus votre progression | idem |
| Lien | le lien officiel envoyé par la personne qui vous a donné le jeu | idem |

Aucun droit particulier n'est nécessaire : ni mode développeur, ni « sources inconnues », ni compte. N'installez le jeu qu'avec le lien officiel : un autre lien n'est pas le jeu.

### Installer sur Android (3 étapes)

1. Touchez le lien officiel que vous avez reçu : il s'ouvre dans Chrome. Si votre téléphone propose un autre navigateur, choisissez Chrome.
2. Touchez le bouton **Installer le jeu** du menu du jeu, puis **Installer**. À défaut, touchez les trois points **⋮** en haut à droite de Chrome, puis **Installer l'application**.
3. Ouvrez le jeu depuis son icône sur l'écran d'accueil, **avec la connexion**, et attendez que « Prêt à jouer hors ligne » s'affiche (Réglages, puis « À propos »). Cela prend quelques secondes.

### Installer sur iPhone (3 étapes)

1. Ouvrez le lien officiel dans **Safari**.
2. Touchez **Partager** (le carré avec une flèche vers le haut), puis **Sur l'écran d'accueil**. Si vous ne voyez pas le bouton Partager, tenez un instant le téléphone à la verticale.
3. Touchez **Ajouter**, puis ouvrez le jeu depuis son icône **avec la connexion** et attendez « Prêt à jouer hors ligne » (Réglages, puis « À propos »). Sur iPhone, ce premier lancement connecté est indispensable : c'est lui qui prépare le jeu pour le mode sans réseau.

### Vérifier que le jeu fonctionne sans réseau

1. Attendez « Prêt à jouer hors ligne » dans Réglages > À propos.
2. Activez le mode avion et fermez complètement le jeu.
3. Rouvrez-le depuis son icône : le menu s'affiche et une partie se lance. C'est terminé, vous n'avez plus besoin de connexion.

Le jeu s'affiche en paysage : tenez le téléphone à l'horizontale.

### Vérifier que le lien est le bon (facultatif)

Chaque version publiée est accompagnée d'un fichier `SHA256SUMS`. Pour le vérifier, il faut un ordinateur : voir « Vérifier l'intégrité d'une version » dans la partie du mainteneur. Cette vérification n'est pas nécessaire pour jouer ; l'essentiel est d'utiliser le lien officiel, qui commence par `https://`.

### Mettre à jour

Quand une nouvelle version existe, le jeu la propose, jamais pendant une partie : ouvrez-le avec une connexion, puis Réglages > À propos > **Installer** (le texte « Nouvelle version … disponible » s'affiche). Votre progression est conservée. Rien ne change sans ce geste.

Avant une mise à jour, faites par prudence une sauvegarde : Sauvegarde > Créer une sauvegarde.

**iPhone : ne supprimez jamais l'icône pour « mettre à jour »**, la progression serait effacée.

### Désinstaller

| | Désinstaller le jeu | Effacer aussi la progression |
|---|---|---|
| Android | appui long sur l'icône, puis **Désinstaller** | Chrome > ⋮ > Paramètres > Paramètres des sites > Toutes les données des sites > l'adresse du jeu > Effacer. Désinstaller l'icône seule peut laisser les données dans Chrome |
| iPhone | appui long sur l'icône, puis **Supprimer l'app** | la suppression de l'icône efface les données du jeu |

Pour garder votre progression, faites d'abord Sauvegarde > Créer une sauvegarde : le fichier reste sur le téléphone, et Sauvegarde > Restaurer le recharge après une réinstallation ou sur un autre téléphone. Le jeu ne supprime jamais ce fichier.

### Dépannage

| Constat | Que faire |
|---|---|
| Android : « Installer l'application » n'apparaît pas | Vérifiez que vous êtes dans Chrome (pas dans un navigateur proposé par la marque du téléphone), avec la connexion, et que le lien est le lien officiel. Rechargez la page, puis rouvrez le menu ⋮ |
| iPhone : « Sur l'écran d'accueil » n'apparaît pas | Vérifiez que vous êtes dans Safari. Faites défiler la feuille de partage vers le bas : l'action peut se trouver sous les autres |
| « Hors ligne non disponible : ouvrez le jeu une fois avec une connexion » | Ouvrez le jeu depuis son icône avec la connexion et restez dessus jusqu'à « Prêt à jouer hors ligne » |
| « Préparation du mode hors ligne… Restez connecté » reste affiché | Gardez le jeu ouvert avec une bonne connexion ; si le message persiste plusieurs minutes, fermez le jeu et rouvrez-le avec la connexion |
| Le jeu ne tient pas dans l'écran, ou demande de tourner le téléphone | Tenez le téléphone à l'horizontale et désactivez le verrouillage de la rotation |
| Message « La progression n'a pas pu être enregistrée » (E-08) | Libérez de l'espace sur le téléphone, puis rejouez une partie : la progression est réenregistrée |
| « La mise à jour n'a pas pu être installée » (E-06) | Votre version actuelle reste utilisable. Réessayez plus tard avec une meilleure connexion |
| Le jeu s'ouvre dans le navigateur, sans icône | Il n'est pas installé : reprenez l'installation à l'étape 2 |

## Pour le mainteneur

Le jeu est publié par l'intégration continue du dépôt, sur GitHub Pages, à partir d'une étiquette `vX.Y.Z`. Aucune installation sur un serveur, aucun jeton à créer, aucune publication manuelle de fichiers.

### Prérequis

- Un compte GitHub avec authentification à plusieurs facteurs, et `git`. Pour les contrôles de la liste de première publication : l'outil `gh`, connecté à ce compte.
- Le dossier du projet tel que livré : c'est déjà un dépôt git, branche `main`, auteur « CocoClaudo ».
- Pour reconstruire ou tester en local (facultatif) : Node.js 22 (`.nvmrc`) et npm.

### Première publication

Le dépôt et l'adresse de publication seront publics (code, versions, adresse du jeu), comme convenu.

1. **Créer le dépôt.** Sur GitHub, créez un dépôt **public** et **vide** nommé `serpent-cosmique` (ni README, ni licence, ni `.gitignore`). Si votre compte héberge déjà un autre site GitHub Pages, créez-le plutôt dans une organisation gratuite dédiée (voir la case 1 de la liste de contrôle).
2. **Y envoyer le projet :**
   ```
   git -C <dossier du projet> remote add origin https://github.com/Elisa060302/serpent-cosmique.git
   git -C <dossier du projet> push -u origin main
   ```
   Vérifiez que les commits portent l'adresse `noreply` prévue (case 11 de la liste de contrôle). L'intégration continue démarre ; laissez-la finir.
3. **Régler le dépôt.** Activez GitHub Pages (dépôt > Settings > Pages > Source : « GitHub Actions », sans rien publier), puis déroulez, case par case, la liste « Avant la première publication » de `docs/guide-exploitation.md`. **Une case non cochée interdit la première publication.**
4. **Publier.** Quand l'intégration continue de `main` est au vert :
   ```
   git tag v1.0.0
   git push origin v1.0.0
   ```
   L'étiquette doit porter exactement la version de `package.json`. Le workflow « Publication » contrôle l'étiquette, construit le site, le publie sur Pages puis crée la version GitHub (archive, `SHA256SUMS`, SBOM).
5. **Contrôler le résultat** : voir « Vérifier la publication » ci-dessous, puis envoyez aux joueurs l'adresse `https://elisa060302.github.io/serpent-cosmique/` (ou celle de l'organisation). C'est le **seul lien officiel** : ne le remplacez ni ne le raccourcissez par un service tiers.

### Vérifier la publication

- Le jeu répond en HTTPS : `curl -sI https://elisa060302.github.io/serpent-cosmique/ | head -1` — attendu : `HTTP/2 200`.
- La version GitHub contient trois fichiers : `serpent-cosmique-X.Y.Z.zip`, `serpent-cosmique-X.Y.Z.cdx.json` et `SHA256SUMS`.
- Sur un téléphone, parcourez la partie « Pour le joueur » ci-dessus, jusqu'à la vérification en mode avion.

### Vérifier l'intégrité d'une version

Sur un ordinateur : téléchargez les trois fichiers de la version dans un dossier vide, puis, **avant** d'ouvrir l'archive :

```
sha256sum --check SHA256SUMS
```

Attendu : « OK » pour l'archive et pour la SBOM. Sous macOS : `shasum -a 256 --check SHA256SUMS`. Sous Windows (PowerShell) : `Get-FileHash .\serpent-cosmique-X.Y.Z.zip -Algorithm SHA256`, à comparer à la ligne correspondante de `SHA256SUMS`. L'archive contient exactement les fichiers publiés sur le site. Aucune commande ne doit être exécutée depuis le réseau sans vérification préalable.

### Publier une nouvelle version

Procédure de `docs/guide-exploitation.md` (« Publier une version ») : modifier `version` dans `package.json`, fusionner sur `main`, attendre l'intégration continue, poser l'étiquette. Les joueurs la reçoivent par Réglages > À propos > Installer, sans perte de progression.

### Reconstruire en local (facultatif)

```
npm ci
npm run build
npm test
npm run serve
```

Le site est alors servi sur `http://127.0.0.1:4173/` (variable `PORT` pour un autre port). Les tests d'acceptation (`npm run test:e2e`) demandent en plus les navigateurs de test : `npx playwright install chromium`. Pour fabriquer les fichiers d'une version : `sh scripts/release-files.sh X.Y.Z <dossier>` (nécessite `zip`), après `npm run build`.

### Désinstaller côté mainteneur

Supprimer la publication : désactiver Pages (Settings > Pages) ou supprimer le dépôt. Les téléphones qui ont déjà installé le jeu continuent de fonctionner hors ligne ; ils ne reçoivent plus de mise à jour.

## Annexe — Vérification de l'installation

Test d'installation propre réalisé par l'équipe projet le 2026-11-08, à partir d'une copie propre du dépôt (un seul commit « Version 1.0.0 », auteur « CocoClaudo <noreply@example.invalid> »), dans un dossier vide. Environnement : Linux x86_64, Node.js 22.23.4, npm 10.9.9, Chromium de Playwright 1.63.0. Aucune publication réelle n'a eu lieu ; les parcours sur téléphone (Android, iPhone) relèvent de la recette sur appareils.

| Étape | Commande | Résultat |
|---|---|---|
| 1 | copie propre du dépôt, `git ls-files`, `git log --format='%an <%ae>'` | 199 fichiers ; un seul auteur, CocoClaudo ; aucun fichier hors du dossier requis |
| 2 | `npm ci` | 105 paquets installés, 0 vulnérabilité, aucun script d'installation exécuté |
| 3 | `npm run lint` et `npm run typecheck` | réussis, sans avertissement |
| 4 | `npm test` | 567 tests réussis sur 567 ; couverture de `src/core` : 99,6 % des lignes (seuil 80 %) |
| 5 | `npm run build` | « Construction terminée : dist/ (version 1.0.0, 67 fichiers, sw.js 7224 octets) » |
| 6 | `npm audit` | 0 vulnérabilité |
| 7 | `npx playwright test` (Chromium, profils Android et iPhone paysage) | 558 tests d'acceptation réussis sur 558 (19,7 min), dont les contrôles d'accessibilité, le mode sans réseau et la mise à jour |
| 8 | `PORT=4180 npm run serve`, puis `curl` sur `/`, `/sw.js`, `/manifest.webmanifest` | 200, 200, 200 (`application/manifest+json`) ; titre « Serpent Cosmique » |
| 9 | `sh scripts/release-files.sh 1.0.0 <dossier>` | archive de 127 485 octets, SBOM CycloneDX 1.5 (105 composants), `SHA256SUMS` ; `sha256sum --check SHA256SUMS` : deux « OK » |
| 10 | désinstallation : suppression du dossier de la copie | rien d'autre à nettoyer (aucune installation hors du dossier) |

Contrôles de la chaîne de publication (sans exécution réelle) :

- Les sept références d'actions épinglées par empreinte ont été comparées aux étiquettes de version avec `git ls-remote` : toutes concordent ; la somme SHA-256 de gitleaks (8.30.1) a été recalculée sur le fichier téléchargé : elle concorde ; le commit des règles Semgrep est joignable.
- `zizmor` (analyse des workflows, hors ligne) : aucun écart.
- Non exécutés ici : Semgrep avec les règles du registre, gitleaks, osv-scanner (hôtes non joignables ou outils absents du poste) ; ils s'exécutent dans l'intégration continue du dépôt (fichier `.github/workflows/ci.yml`).

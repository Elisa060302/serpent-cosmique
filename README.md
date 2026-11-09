# Serpent Cosmique

Jeu de serpent coloré en paysage, conçu pour un téléphone (Android et iPhone) : installable sur l'écran d'accueil et jouable sans connexion.

**Serpent Cosmique est un jeu de serpent coloré dans l'espace, à jouer à l'horizontale sur un téléphone Android ou un iPhone, installable sur l'écran d'accueil et jouable sans connexion.** Version 1.0.0.

## À quoi sert-il ?

Le serpent mange des bonbons de quatre couleurs, grandit, prend la couleur du dernier bonbon mangé et devient arc-en-ciel à chaque dizaine. Le jeu propose sept modes (Classique, Contre la montre, Champ d'astéroïdes, Trou noir, Bonus et pièges, Zen et le mode surprise Constellation), un tableau des 10 meilleurs scores par mode, 16 skins à débloquer, des réglages (glissement ou flèches, bruitages, musique, vibrations), la sauvegarde de la progression dans un fichier et une pause automatique à chaque interruption. Il est en français, sans compte, sans publicité et gratuit.

## Installation rapide

Ouvrez le lien officiel du jeu (`https://elisa060302.github.io/serpent-cosmique/`, adresse donnée par le mainteneur) dans Chrome (Android) ou Safari (iPhone), ajoutez-le à l'écran d'accueil, puis ouvrez-le une fois avec une connexion jusqu'à « Prêt à jouer hors ligne ». Pas à pas : `docs/guide-installation.md`.

## Premier usage

Touchez **Jouer**, choisissez **Classique**, puis glissez le doigt pour diriger le serpent et mangez les bonbons. Détail des modes, des skins, des records et de la sauvegarde : `docs/guide-utilisateur.md`.

## Documentation

- `docs/guide-installation.md` : installer, mettre à jour et désinstaller le jeu ; publier pour le mainteneur.
- `docs/guide-utilisateur.md` : jouer, modes, skins, records, réglages, sauvegarde, messages d'erreur.
- `docs/guide-exploitation.md` : configuration, données, sauvegarde, mise à jour, diagnostic, limites, liste de contrôle avant la première publication.
- `SECURITY.md` : signalement d'une vulnérabilité, données traitées, conseils d'usage sûr.
- `CHANGELOG.md` : historique des versions.
- `docs/projet/` : dossier du projet (expression du besoin et hypothèses, spécifications, architecture, analyse de risques, conception, plan, cahier de recette, rapports de tests et d'audit, revues de code).

## Pour les développeurs

### Prérequis

- Node.js 22 (voir `.nvmrc`) et npm.
- Pour les tests d'acceptation : les navigateurs de Playwright (`npx playwright install chromium`, plus `webkit` en intégration continue).

### Commandes

| Commande            | Rôle                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm ci`            | installe les dépendances de développement aux versions verrouillées (aucun script d'installation n'est exécuté) |
| `npm run build`     | construit le site dans `dist/`                                                                                  |
| `npm run lint`      | ESLint et Prettier                                                                                              |
| `npm run typecheck` | vérification des types (TypeScript strict)                                                                      |
| `npm test`          | tests unitaires, couverture de `src/core` d'au moins 80 %                                                       |
| `npm run test:e2e`  | construit puis lance les tests d'acceptation (Playwright)                                                       |
| `npm run serve`     | sert `dist/` sur `http://127.0.0.1:4173/` (variable `PORT` pour changer le port)                                |

Analyse statique Semgrep, comme l'exécute l'intégration continue (Python 3 ; version de Semgrep et commit des règles figés comme dans `.github/workflows/ci.yml`) :

```
pip install semgrep==1.183.0
semgrep scan --config .semgrep.yml --metrics off --disable-version-check --error src
git clone https://github.com/semgrep/semgrep-rules .semgrep-rules
git -C .semgrep-rules checkout 16b9e6d45f10649f6a531ec4838ed9924372c3bc
semgrep scan --config .semgrep-rules/javascript --config .semgrep-rules/typescript --metrics off --disable-version-check --error src
```

Chaque analyse doit se terminer par « 0 findings » ; `--error` fait échouer la commande sinon. Le dossier `.semgrep-rules/` est ignoré par git. Le `ref` du commit est celui de `ci.yml` : s'il y change, utilisez le nouveau.

`npm run build` injecte la version de `package.json` dans le jeu et dans l'agent de service (`dist/sw.js`, 9 000 octets au plus), avec l'empreinte SHA-256 de chaque fichier ; il échoue si `dist/` contient un fichier de trop ou en manque un. Pour fabriquer les fichiers d'une version (archive du site, SBOM CycloneDX, `SHA256SUMS`) : `sh scripts/release-files.sh <version> <dossier>` après `npm run build`.

### Structure

- `src/core/` : règles du jeu, sans dépendance au navigateur (`rules.ts` rassemble toutes les valeurs des règles ; `engine.ts` fait avancer la partie, `modes/` décrit chaque mode ; `progress.ts`, `records.ts` et `skins.ts` tiennent la progression (déblocages, choix, avancement des conditions) ; `validation.ts` est l'unique point de contrôle de toute progression lue, `savefile.ts` écrit et relit son enveloppe avec une somme de contrôle SHA-256).
- `src/platform/` : adaptateurs du navigateur (stockage de la progression dans IndexedDB, bouton retour, orientation, perte du premier plan, écran maintenu allumé, bruitages et musique synthétisés par Web Audio, vibrations, installation et mises à jour).
- `src/sw/` : l'agent de service (fichiers servis depuis le cache seul, mise à jour sur consentement avec vérification des empreintes).
- `src/ui/` : écrans, dessin de l'aire de jeu et textes (tous les textes affichés sont dans `src/ui/texts.ts`).
- `public/` : page, feuille de style, manifeste et icônes.
- `scripts/` : construction, serveur local, génération des icônes et fichiers d'une version.
- `docs/guide-exploitation.md` : liste de contrôle « Avant la première publication » et marche à suivre pour publier ; `SECURITY.md` : signalement des vulnérabilités et données échangées.
- `tests/` : tests unitaires (`node:test`), d'acceptation (Playwright) et outils communs aux deux (`tests/support/`).

Pour rejouer exactement la même partie, ajoutez `?seed=42` (un entier de 0 à 4 294 967 295) à l'adresse du jeu.

## Données du joueur et sécurité (résumé)

La progression (records, dernier nom, compteurs, skins, réglages) reste sur le téléphone, dans la base IndexedDB du jeu (`serpent-cosmique`), et nulle part ailleurs. Aucune donnée n'est envoyée ; détails et conseils dans `SECURITY.md`. Chaque modification est écrite en une seule transaction durable ; la version précédente est gardée et reprise si la dernière est illisible. Le jeu demande au navigateur de ne pas effacer ces données (`navigator.storage.persist()`), sans aucune invite.

## Installation et mises à jour

Pas à pas pour les joueurs (Android et iPhone) et pour le mainteneur (publication, vérification des sommes de contrôle) : `docs/guide-installation.md`.

En ligne, le navigateur propose d'installer le jeu (bouton « Installer le jeu » du menu, étapes pour Android et iPhone). Après un premier chargement avec connexion, « Prêt à jouer hors ligne » s'affiche dans « À propos » : le jeu fonctionne alors sans réseau. À l'ouverture, quand le téléphone est connecté, le navigateur vérifie si une nouvelle version existe (10 Ko au plus) ; elle est proposée dans « À propos » et ne s'installe qu'après le toucher de « Installer ».

Les versions se publient en posant une étiquette `vX.Y.Z` sur la branche principale (`.github/workflows/release.yml`). Les règles Semgrep du registre sont récupérées à un commit figé (`ref` dans `.github/workflows/ci.yml`).

## Sécurité

Le jeu n'émet aucune requête : la politique de sécurité du contenu (balise en tête de `public/index.html`) interdit toute connexion sortante. Seul l'agent de service télécharge les fichiers du jeu, à l'installation et à la mise à jour consentie. Les règles d'analyse statique (`eslint.config.js`, `.semgrep.yml`) interdisent l'injection de HTML, l'exécution de code construit, le réseau et les API soumises à permission.

## Origine des ressources et licence

Tous les graphismes sont dessinés par le code ou fournis par ce dépôt (icônes originales, `public/icons/icon.svg`), les sons sont synthétisés par le code et la police est celle du système : aucune ressource tierce n'est embarquée. Le jeu est distribué sous licence MIT (voir `LICENSE`), © CocoClaudo. Aucune dépendance n'est livrée avec le jeu : les dépendances de `package.json` ne servent qu'à le construire et à le tester.

# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; les versions suivent le [versionnage sémantique](https://semver.org/lang/fr/).

## [1.0.0] - 2026-11-08

Première version de Serpent Cosmique.

### Ajouté

- Jeu de serpent coloré en paysage pour téléphone (Android et iPhone), installable sur l'écran d'accueil et jouable sans connexion.
- Sept modes de jeu : Classique, Contre la montre, Champ d'astéroïdes, Trou noir, Bonus et pièges, Zen, et le mode surprise Constellation, découvert après trois parties terminées.
- Règles de couleur : le serpent est rose au départ, prend la couleur du dernier bonbon mangé et devient arc-en-ciel à chaque dizaine de bonbons.
- Commande au glissement ou aux flèches, pause, abandon, pause automatique à chaque interruption (appel, notification, verrouillage, autre application, téléphone à la verticale).
- Tableau des 10 meilleurs scores par mode, avec saisie du nom.
- 16 skins (formes, motifs, traînées, décors) à débloquer et à choisir, et constellations complétées ajoutées au ciel du décor.
- Réglages de la commande, des bruitages, de la musique et des vibrations.
- Sauvegarde de la progression dans un fichier et restauration par fusion, entière ou nulle, avec contrôle d'intégrité.
- Reprise d'une partie interrompue : enregistrée comme « Partie abandonnée » au lancement suivant.
- Mise à jour à la demande (Réglages > À propos > Installer), avec vérification des empreintes des fichiers ; vérification de version de moins de 10 Ko à l'ouverture quand le téléphone est connecté, sans aucune donnée du joueur.
- Messages d'erreur numérotés E-01 à E-08.
- Publication automatique par étiquette `vX.Y.Z` avec archive, `SHA256SUMS` et SBOM CycloneDX.
- Documentation : guides d'installation, utilisateur et d'exploitation, politique de sécurité.

### Limites connues

- iPhone : pas de vibrations, orientation non imposée.
- Un rechargement forcé sur poste de bureau contourne le consentement à la mise à jour (limite du navigateur).

## Droits

© 2026 CocoClaudo, titulaire des droits. Licence MIT (voir `LICENSE`).

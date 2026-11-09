# Sécurité de Serpent Cosmique

## Versions maintenues

Seule la dernière version publiée (actuellement 1.0.0) reçoit des corrections de sécurité. Les joueurs la reçoivent par « Réglages » > « À propos » > « Installer ».

## Signaler une vulnérabilité

Utilisez le signalement privé de GitHub : onglet « Security » du dépôt, puis « Report a vulnerability ». Ne publiez pas de détail dans une discussion ou un ticket public. Aucune adresse électronique n'est publiée pour cet usage.

## Lien officiel

Le jeu s'installe et se met à jour depuis un seul lien : l'adresse de publication du dépôt (GitHub Pages), donnée par le mainteneur. N'installez pas le jeu depuis un autre lien, une autre application ou un fichier reçu d'une source inconnue. Les versions publiées portent une archive du site, un fichier `SHA256SUMS` et une SBOM (liste des composants), que l'on peut vérifier sur un ordinateur avec `sha256sum --check SHA256SUMS`.

## Données et communication

- La progression (records, dernier nom, compteurs, skins, réglages, partie en cours) est enregistrée dans l'espace privé du navigateur de ce téléphone (base IndexedDB `serpent-cosmique`). Elle n'est envoyée nulle part ; le jeu n'émet aucune requête et n'utilise aucun service externe.
- Le jeu ne demande aucune permission : ni position, ni appareil photo, ni micro, ni notifications, ni contacts.
- Seule l'installation du jeu et la vérification de sa version utilisent le réseau, entre le navigateur du téléphone et l'adresse officielle. GitHub reçoit l'adresse IP du téléphone à l'installation, à chaque mise à jour installée et à chaque vérification de version (à l'ouverture du jeu, quand le téléphone est connecté). Aucune donnée du joueur n'est transmise. En mode avion, rien n'est échangé.

## Fichier de sauvegarde

- « Sauvegarde » > « Créer une sauvegarde » écrit un fichier `serpent-cosmique-sauvegarde-AAAA-MM-JJ-HHMM.json` dans le dossier Téléchargements, dans l'application Fichiers ou à l'endroit choisi. Il contient exactement la progression : records avec les noms saisis, dernier nom, skins, compteurs et réglages, ainsi qu'une somme de contrôle. Il ne contient aucun identifiant du téléphone ni aucune donnée de diagnostic. Le jeu ne supprime jamais un fichier de sauvegarde et n'en remplace jamais un de lui-même : un fichier existant n'est remplacé que si vous l'avez choisi vous-même dans la fenêtre d'enregistrement du téléphone et avez confirmé le remplacement.
- **Ce fichier n'est pas chiffré** : les noms de joueur y sont lisibles par toute personne qui le reçoit. Ne le partagez qu'avec des personnes de confiance et supprimez-le quand il ne sert plus.
- **Ne restaurez que des fichiers que vous avez créés vous-même.** La somme de contrôle détecte une altération accidentelle, pas une falsification : quelqu'un qui connaît le format peut fabriquer un fichier valide. Le jeu refuse tout fichier de plus de 256 Kio, abîmé, d'une autre application ou contenant une valeur hors des limites, sans rien modifier. Un fichier valide mais inconnu pourrait malgré tout remplacer vos réglages et vos skins choisis, et ajouter des records, des skins et des compteurs fictifs : n'importez pas un fichier d'origine inconnue.
- La restauration fusionne le fichier avec la progression du téléphone après un résumé et une confirmation ; elle est entière ou nulle. Les records, skins et compteurs actuels ne sont jamais retirés.

## Mises à jour

Sur le téléphone, une nouvelle version n'est jamais installée sans le geste du joueur (voir « Limite du navigateur » pour le cas d'un ordinateur) : elle est proposée dans « Réglages » > « À propos » et s'installe en touchant « Installer ». Les fichiers téléchargés sont vérifiés par empreinte SHA-256 avant d'être utilisés ; en cas d'échec, la version en place reste utilisable et la progression est intacte.

Ce consentement n'est pas une protection contre une publication piégée : l'agent de service et ses empreintes viennent de la même adresse officielle, et une publication compromise pourrait ne pas respecter le consentement. La protection tient au compte et au dépôt du mainteneur : authentification à plusieurs facteurs, branche principale et étiquettes `v*` protégées, publication par l'intégration continue seule, réglages vérifiés avant la première publication (voir `docs/guide-exploitation.md`).

## Risque accepté

Les données du jeu sont rattachées à l'origine du compte GitHub (`https://elisa060302.github.io`), commune à tous les sites GitHub Pages de ce compte. Un site ajouté plus tard sur le même compte pourrait lire ou modifier les données du jeu, ou écrire dans son cache. Ce risque est accepté ; il est écarté au départ par la vérification obligatoire, avant la première publication, qu'aucun autre site Pages n'est publié sur le compte (sinon, publication depuis une organisation gratuite dédiée). Ne publiez jamais un autre site sur ce compte.

## Limite du navigateur

Le consentement vaut pour le jeu installé et pour un rechargement ordinaire. Sur un ordinateur, un rechargement forcé (Maj + rechargement) charge la dernière version publiée sans passer par ce consentement. Ce geste n'existe pas dans le jeu installé sur téléphone ; il n'affecte pas la progression.

## Conseils aux joueurs

- Ne supprimez pas l'icône du jeu pour le mettre à jour : sur iPhone, cela efface la progression. Utilisez « À propos » > « Installer ».
- Effacer les données du site dans le navigateur efface la progression ; une sauvegarde par fichier (« Sauvegarde » > « Créer une sauvegarde ») permet de la conserver et de la retrouver sur un autre téléphone. Créez-en une avant d'installer une nouvelle version.

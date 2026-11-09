# Revue de code — LOT-06

## Itération 1 — 2026-11-07
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-05 » :
  - moteur : `src/core/merge.ts`, `src/core/savefile.ts` ;
  - plateforme : `src/platform/save-io.ts` ;
  - interface : `src/ui/screens/{save,about,menu}.ts`, `src/ui/texts.ts`, `src/main.ts`, `public/styles.css` ;
  - documentation : `SECURITY.md` ;
  - tests : `tests/fixtures/saves/corpus.ts`, `tests/unit/{sauvegarde,fusion,lint}.test.ts`, `tests/acceptance/{sauvegarde,securite,installation}.spec.ts`, `tests/acceptance/support/fichiers.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 432 réussis, 0 échoué ; couverture de `src/core` : lignes 99,8 %, branches 96,2 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 352 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium) ;
  - stabilité, répétition des tests du lot :
    - `npx playwright test tests/acceptance/sauvegarde.spec.ts tests/acceptance/securite.spec.ts --repeat-each=5` → 230 réussis sur 230 ;
    - `node --test tests/unit/sauvegarde.test.ts tests/unit/fusion.test.ts`, lancé 3 fois → 26 réussis sur 26 à chaque fois.
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat (7 règles, 49 fichiers) ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté ici : la CI GitHub (WebKit, gitleaks, osv-scanner).
- **Verdict** : APPROUVE

Point d'attention RSK-01 (restauration, seul point d'entrée non fiable) :
- **Limite de taille avant lecture** : `readBackupFile` refuse sur `File.size` (vide, ou plus de 262 144 octets) avant tout `file.text()`. Une sonde le vérifie dans le navigateur : 262 144 octets sont lus et acceptés, 262 145 octets et 600 Ko donnent E-01 sans aucune lecture. `readBackup` contrôle de nouveau la longueur du texte avant `JSON.parse`.
- **Validateur** : le module unique de LOT-03 est réutilisé sans changement, en mode strict (dates futures refusées au-delà de 24 h). La somme SHA-256 est recalculée à partir des seules valeurs validées, et aucune exception ne sort (`JSON.parse` capté).
- **Corpus piégé** (`tests/fixtures/saves/corpus.ts`) : il couvre toute la liste de 06, et plus :
  - fichiers : vide, 10 Mo, binaire, PNG, JSON d'une autre application, JSON tronqué, caractères en trop, somme fausse, versions de format future, nulle et décimale ;
  - structure : champs inconnus à trois niveaux, champ manquant, `__proto__`, `constructor` et `prototype` ;
  - valeurs : scores négatif, nul, décimal, `1e308`, `null`, texte, `NaN`, `Infinity`, compteurs hors bornes, 1 000 records et 11 records dans un mode ;
  - noms : 10 000 caractères, 13 caractères, vide, U+202E, U+200F, U+200E, U+061C, U+2066, caractère de contrôle, retour à la ligne, espaces de bord, substitut isolé ;
  - skins : inconnu, choisi non débloqué, défaut retiré ; mode inconnu ; enfin 100 000 crochets et `records` ou `data` sous forme de tableau.
  - Les cas de valeur sont fabriqués avec une somme recalculée : c'est bien le validateur qui les refuse, pas la somme. Tout est refusé (E-02 seulement pour les versions futures), sans exception, ni console, ni requête, et la progression reste intacte, en unitaire comme dans le navigateur. S'y ajoutent 10 000 mutations reproductibles en unitaire et 50 dans le navigateur.
- **Fusion en une seule écriture** : `mergeProgress` construit une structure neuve champ par champ (règle ESLint active sur `merge.ts`) à partir de deux progressions validées. Le résultat passe le validateur, ce qui est testé. `restoreBackup` l'écrit par un seul `storage.commit` (une transaction, testée), et la progression en mémoire n'est remplacée qu'après la confirmation de l'écriture. Un échec donne E-07 : progression identique après réouverture, une seule écriture tentée.

Choix déclarés, jugés :
- **Ordre sélecteur d'enregistrement, puis partage (hors Android), puis téléchargement** : accepté. Il suit 03 § 5.1 : `showSaveFilePicker` quand il existe, partage vers « Enregistrer dans Fichiers » sur iPhone, Téléchargements sinon. Le partage est écarté sur Android, où il ne range le fichier nulle part de durable. Une annulation (`AbortError`) ne produit aucun message, conformément à RG-69.
- **E-02 sans contrôle de somme** : accepté. Une version de format inconnue ne peut pas être vérifiée par cette version du jeu. Le pire cas, un fichier forgé qui se déclare d'un format futur, obtient E-02 au lieu d'E-01. Les deux messages disent que rien n'a été modifié, et le fichier n'est jamais utilisé. La taille et la validité JSON restent contrôlées avant.
- **Déblocages revérifiés après fusion** : conforme à RG-70 et RG-56. Les conditions de score sont évaluées sur le meilleur record fusionné de chaque mode, celles de compteur et « tous les modes » sur les compteurs fusionnés. Le procédé est prudent : un record suffit à prouver la partie qui l'a produit.
- **« Jamais écraser » de RG-68 limité au téléchargement quand le système propose lui-même de remplacer** : acceptable dans son principe, car le remplacement exige deux gestes explicites du joueur dans la fenêtre du système. Mais il contredit la lettre de RG-69, d'ENF-15 et de `SECURITY.md` (« Le jeu ne le supprime ni ne le modifie jamais ») (constat 1).

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | `src/platform/save-io.ts:91-111` ; `SECURITY.md` (« Fichier de sauvegarde ») | Avec le sélecteur d'enregistrement, le joueur peut désigner un fichier de sauvegarde existant et confirmer son remplacement dans la fenêtre du système : `createWritable()` puis `write()` l'écrasent. RG-69 et ENF-15 (« le jeu ne supprime ni ne modifie jamais un fichier de sauvegarde ») et `SECURITY.md` disent le contraire. | Au choix : refuser d'écrire dans un fichier existant non vide (`(await handle.getFile()).size > 0`), sans rien écrire et avec E-04, test à l'appui ; ou faire consigner l'écart par l'équipe projet (02 RG-69, ENF-15) et corriger la phrase de `SECURITY.md`. |
| 2 | MINEUR | `src/ui/screens/save.ts:123-145` | Les erreurs durables E-01, E-02, E-03, E-04 et E-07 ne portent pas l'icône « ! » demandée par 05 § 6 (« erreur : icône « ! » + texte + code »), alors qu'E-06 et E-08 l'ont reçue en LOT-03 et LOT-05. | Ajouter la même icône, masquée aux lecteurs d'écran, et la vérifier dans `ct_51` et `ct_55`. |
| 3 | SUGGESTION | `src/ui/screens/save.ts:46-49` | Le champ de fichier caché est créé par `document.createElement`, hors de `ui/dom.ts`, qu'EXS-06 désigne comme seul point de construction des écrans. Ce n'est pas risqué en soi (aucun texte ni HTML), mais c'est une exception au principe. | Passer par `createElement` (en ajoutant `accept` à la liste fermée des attributs), ou commenter l'exception. |

Points positifs :
- Toute la chaîne d'import est défensive et testée à chaque étape :
  - taille sur `File.size` ;
  - longueur du texte ;
  - `JSON.parse` capté ;
  - liste blanche ;
  - somme recalculée ;
  - refus total.
- Le nom du fichier importé n'est jamais lu.
- Le corpus est complet et construit avec soin : sommes recalculées pour viser le validateur, mutations reproductibles, prototype vérifié après chaque fichier, absence de requête et de console.
- La fusion est sûre : structure neuve, idempotente (seconde restauration sans effet, testée), skins jamais retirés, découverte du mode surprise rendue définitive par le maximum des compteurs. Elle est atomique : une transaction, et la mémoire n'est remplacée qu'après succès.
- E11 est conforme à 05 :
  - deux touchers depuis le menu ;
  - résumé avec date, records et skins ;
  - focus sur « Annuler » ;
  - erreurs durables avec « Réessayer » ou « Compris » ;
  - aide propre à l'iPhone et avertissement sur les fichiers d'origine inconnue ;
  - analyse axe sans violation sur tous les états, et lien « Créer une sauvegarde » depuis « À propos ».
- Les performances sont tenues avec le jeu de données maximal (50 Ko au plus, création en 2 s, restauration en 3 s), et `SECURITY.md` décrit le fichier, son absence de chiffrement et la prudence à observer.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

# Revue de code — LOT-04

## Itération 1 — 2026-11-02
- **Fichiers revus** : changements depuis le commit « feat(jeu-serpent): LOT-03 » :
  - plateforme : `src/platform/{lifecycle,audio,haptics,storage}.ts` ;
  - interface et démarrage : `src/ui/screens/{settings,game,pause,menu}.ts`, `src/ui/render/hud.ts`, `src/ui/texts.ts`, `src/main.ts` ;
  - moteur : `src/core/{progress,rules}.ts` ;
  - `public/styles.css`, `README.md`, suppression de `src/ui/settings-state.ts` ;
  - tests : `tests/acceptance/{interruptions,reglages,classique,progression}.spec.ts`, `tests/acceptance/support/{jeu,sondes}.ts`, `tests/unit/{interruptions,lint,progression,rules,textes}.test.ts`.
- **Tests exécutés** :
  - `npm run lint` → ESLint et Prettier sans erreur ni avertissement ;
  - `npm run typecheck` → 0 erreur ;
  - `npm test` → 363 réussis, 0 échoué ; couverture de `src/core` : lignes 99,9 %, branches 96,6 %, fonctions 100 % ;
  - `npm run test:e2e` (navigateurs Playwright installés localement) → 254 réussis, 0 échoué, sur les profils « Android paysage » et « iPhone SE paysage » (Chromium) ;
  - stabilité de `ct_61` : `npx playwright test tests/acceptance/interruptions.spec.ts -g "ct_61" --repeat-each=8` → 160 réussis sur 160, soit 8 passages des 10 tests sur les 2 profils.
- **Analyse statique** :
  - `uvx semgrep==1.183.0 scan --config .semgrep.yml --metrics off --error src` → 0 constat sur 41 fichiers ;
  - `npm audit` → 0 vulnérabilité ;
  - contrôle d'autonomie du dépôt (aucun chemin absolu ni lien hors du dépôt dans les fichiers suivis) → aucun constat ;
  - non exécuté ici : la CI GitHub (WebKit, gitleaks, osv-scanner, règles Semgrep du registre).
- **Verdict** : APPROUVE

Arbitrages de l'équipe projet, pris en compte :
- Seuls les noms `ct_NN` font foi. La répartition des CT-09, 46, 47, 48, 49 et 61 entre `interruptions.spec.ts` et `reglages.spec.ts` est acceptée.
- CT-09 sur 5 minutes de Zen et EF-26 CA-2 (chrono de Contre la montre) seront testés avec ces modes, en LOT-07. Dans ce lot, aucun chrono n'existe encore ; le gel des temps de jeu repose sur l'ordonnanceur, remis à zéro à chaque reprise (déjà testé en LOT-02).
- Le bouton « À propos » de E9 relève de LOT-05.

Conformité aux critères de fin de LOT-04 :
- EF-21 :
  - CA-1 : « Flèches » et musique coupée, partie, fermeture forcée du profil, puis réouverture : réglages relus, flèches affichées, aucune note de musique ;
  - CA-2 : valeurs par défaut au premier lancement ;
  - CA-3 : vibrations grisées avec « Non disponible sur ce téléphone », analyse axe sans violation, partie jusqu'à la collision sans erreur ;
  - RG-65 : la pause ne propose pas les réglages.
- EF-22 :
  - CA-1, CA-2 et CA-3 testés avec des sondes Web Audio et `navigator.vibrate` : bruitages, 300 ms à la collision, musique arrêtée hors du premier plan et en pause ;
  - chaque catégorie dépend de son seul réglage (RG-67).
- EF-26 :
  - quatre causes de perte du premier plan (`visibilitychange`, `pagehide`, `blur`, orientation verticale) donnent une pause sans aucun pas de plus ;
  - rien ne bouge pendant une minute ;
  - « Reprendre » est attendu ;
  - les comptes à rebours de départ et de reprise sont aussi mis en pause.
- Verrou d'écran : demandé au début, relâché en pause et à la perte du premier plan, redemandé à « Reprendre », rendu à la fin ; aucune erreur sans l'API.
- Inventaire des API : test statique sur `src/` (seuls `navigator.storage`, `vibrate` et `wakeLock` ; seuls `persist` et `persisted`), complété par la règle ESLint de LOT-01 sur les API à permission. Le test statique interdit aussi `serviceWorker` (la règle ESLint, elle, ne le vise pas) : à adapter en LOT-05.
- Suggestions ouvertes de LOT-02 et LOT-03 : le score n'est réécrit que s'il change, et la mention « Partie mise en pause » est conservée après « Non » (testé). Seule reste ouverte celle des règles Semgrep du registre non figées (constat 4).

Stabilité de `ct_61` (échec isolé signalé) : non reproduit. 160 exécutions consécutives et la suite complète sont vertes. La lecture du test ne révèle aucune dépendance au temps réel : l'horloge est simulée, les événements de perte du premier plan sont envoyés directement, et l'orientation attend la boîte de pause par une assertion qui réessaie. Faute de trace de l'échec signalé, sa cause ne peut pas être établie (constat 3).

| # | Gravité | Fichier:ligne | Constat | Correction attendue |
|---|---|---|---|---|
| 1 | MINEUR | `src/ui/screens/game.ts:69-75` | Une partie terminée par « Abandonner », puis « Oui », ne joue pas le bruitage de fin de partie. Il n'est joué qu'à la collision et à la victoire (`update`). Or RG-66 prévoit un bruitage à toute fin de partie, et « Partie abandonnée » en est une (RG-44). Aucun test ne couvre ce cas. | Jouer `end` dans `onAbandon`, et l'ajouter au test `ct_48_sons_et_vibrations` (abandon : bruitage de fin, aucune vibration). |
| 2 | SUGGESTION | `src/ui/screens/settings.ts:48-76` | Le groupe « Commande » a `role="radiogroup"`, mais ses deux boutons `role="radio"` sont chacun dans l'ordre de tabulation et ne répondent pas aux flèches du clavier. C'est le comportement attendu d'un groupe radio selon le motif ARIA. L'analyse axe ne le signale pas. | Gérer les flèches et un seul arrêt de tabulation (`tabindex` itinérant), ou passer à des `input type="radio"` natifs habillés par la feuille de style. |
| 3 | SUGGESTION | `playwright.config.ts` | L'échec isolé de `ct_61` ne peut pas être analysé, faute de trace. | Activer `trace: 'retain-on-failure'` (ou `on-first-retry`) en CI, pour disposer de la trace à la prochaine occurrence. Ne pas ajouter de nouvelles tentatives, qui masqueraient l'instabilité. |
| 4 | SUGGESTION | `.github/workflows/ci.yml:55-56` | Suggestion reportée de LOT-02, toujours ouverte : les règles Semgrep du registre ne sont pas figées. | Voir la revue de LOT-02, constat 12. |

Points positifs :
- `createForeground` réunit en un seul module les quatre sources de perte du premier plan. Il est testé sans navigateur (unitaire) puis dans le navigateur. Le jeu, la musique, les vibrations et le verrou d'écran s'abonnent tous à ce même suivi.
- Le verrou d'écran est robuste : une seule demande à la fois, verrou accordé après relâchement aussitôt rendu, refus du navigateur sans erreur, aucun effet sans l'API.
- L'audio est entièrement synthétisé, sans fichier ni permission. Aucun contexte n'est créé avant un geste du joueur, et toutes les valeurs (notes, volumes, durées de vibration) sont dans `rules.ts` (ENF-19).
- Les réglages sont enregistrés à chaque toucher par le même chemin que la progression : E-08 en cas d'échec, relecture validée au lancement. L'état est écrit en texte, marqué par la forme et la coche (`role="switch"`), jamais par la seule couleur.
- Les tests de flèches passent désormais par l'écran de réglages, comme le ferait le joueur, et non plus par l'import du module.

<!-- Itération suivante : ajouter une section « Itération n » sous la précédente, sans réécrire l'historique. -->

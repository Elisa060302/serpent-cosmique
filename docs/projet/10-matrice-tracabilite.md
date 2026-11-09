# Matrice de traçabilité — Serpent Cosmique v1.0.0

Établie le 2026-11-09 par la recette interne à partir de 02 (EF, ENF), 04 (EXS), 06 (allocation aux lots), 07 § 3 (couverture, 07 v1.5) et 08 § 2 (résultats). Revue à la recette n° 2 du même jour : les corrections apportées à 04, 07, 08, 09, aux revues et aux guides sont rédactionnelles, sans changement d'exigence, d'allocation, de couverture ni de résultat ; la matrice est inchangée. Les ENF et les EXS n'ont pas de priorité MoSCoW dans 02 et 04 : toutes sont exigées (« Exigée »). Un CT « non exécuté » est l'un des 18 CT sur appareil réel, WebKit ou publication réelle, à jouer par le demandeur (HYP-41) ; ils sont repris en réserves dans 11.

| Exigence | Type | Priorité | Besoin source | Lot | Cas de test | Résultat | Statut |
|---|---|---|---|---|---|---|---|
| EF-01 | EF | Must | BES-01 | LOT-02, LOT-07 | CT-01, CT-02, CT-03, CT-60, CT-92, CT-106, CT-111, CT-113 | 7/8 passés ; non exécutés : CT-113 | Partiellement couverte |
| EF-02 | EF | Must | BES-01 | LOT-02, LOT-04 | CT-04, CT-05, CT-06, CT-07, CT-08, CT-09, CT-94, CT-96 | 6/8 passés ; non exécutés : CT-94, CT-96 | Partiellement couverte |
| EF-03 | EF | Must | BES-01, BES-02 | LOT-02 | CT-05, CT-18, CT-21 | 3/3 passés | Couverte |
| EF-04 | EF | Must | BES-02 | LOT-02, LOT-08 | CT-19, CT-24, CT-45 | 3/3 passés | Couverte |
| EF-05 | EF | Must | BES-02 | LOT-02 | CT-20, CT-24, CT-88, CT-110 | 4/4 passés | Couverte |
| EF-06 | EF | Must | BES-03 | LOT-02 | CT-11, CT-12, CT-14, CT-97 | 3/4 passés ; non exécutés : CT-97 | Partiellement couverte |
| EF-07 | EF | Must | BES-03 | LOT-02 | CT-13, CT-14, CT-82, CT-88, CT-97, CT-112 | 4/6 passés ; non exécutés : CT-97, CT-112 | Partiellement couverte |
| EF-08 | EF | Must | BES-03 | LOT-02 | CT-15, CT-16, CT-17 | 3/3 passés | Couverte |
| EF-09 | EF | Must | BES-04 | LOT-02 | CT-22, CT-23 | 2/2 passés | Couverte |
| EF-10 | EF | Should | BES-05 | LOT-07 | CT-25, CT-26 | 2/2 passés | Couverte |
| EF-11 | EF | Should | BES-06 | LOT-07 | CT-27, CT-28 | 2/2 passés | Couverte |
| EF-12 | EF | Should | BES-07 | LOT-07 | CT-29, CT-109 | 2/2 passés | Couverte |
| EF-13 | EF | Should | BES-08 | LOT-07 | CT-30, CT-31 | 2/2 passés | Couverte |
| EF-14 | EF | Should | BES-09 | LOT-07 | CT-08, CT-32 | 2/2 passés | Couverte |
| EF-15 | EF | Could | BES-10 | LOT-07 | CT-03, CT-33, CT-34, CT-53 | 4/4 passés | Couverte |
| EF-16 | EF | Must | BES-01, BES-11, BES-12, BES-13 | LOT-02, LOT-03, LOT-07 | CT-06, CT-08, CT-23, CT-24, CT-34, CT-35, CT-36, CT-79 | 8/8 passés | Couverte |
| EF-17 | EF | Must | BES-12 | LOT-03 | CT-24, CT-32, CT-37, CT-38, CT-125 | 5/5 passés | Couverte |
| EF-18 | EF | Must | BES-13 | LOT-03 | CT-24, CT-39, CT-40, CT-41, CT-60, CT-92, CT-114 | 6/7 passés ; non exécutés : CT-114 | Partiellement couverte |
| EF-19 | EF | Should | BES-11 | LOT-03, LOT-06, LOT-08 | CT-42, CT-43, CT-44, CT-62 | 4/4 passés | Couverte |
| EF-20 | EF | Should | BES-11 | LOT-08 | CT-21, CT-42, CT-45 | 3/3 passés | Couverte |
| EF-21 | EF | Must | BES-14, BES-03 | LOT-04, LOT-05 | CT-46, CT-47, CT-69, CT-94, CT-99, CT-109 | 3/6 passés ; non exécutés : CT-69, CT-94, CT-99 | Partiellement couverte |
| EF-22 | EF | Must | BES-14 | LOT-04 | CT-48, CT-49, CT-99 | 2/3 passés ; non exécutés : CT-99 | Partiellement couverte |
| EF-23 | EF | Must | BES-15 | LOT-06 | CT-50, CT-51, CT-102 | 2/3 passés ; non exécutés : CT-102 | Partiellement couverte |
| EF-24 | EF | Must | BES-15 | LOT-06 | CT-44, CT-52, CT-53, CT-54, CT-55, CT-56, CT-102, CT-108, CT-116, CT-125 | 9/10 passés ; non exécutés : CT-102 | Partiellement couverte |
| EF-25 | EF | Must | BES-16, BES-09 | LOT-02 | CT-17, CT-26, CT-32, CT-49, CT-59, CT-60, CT-96, CT-97, CT-106, CT-108 | 8/10 passés ; non exécutés : CT-96, CT-97 | Partiellement couverte |
| EF-26 | EF | Must | BES-16, BES-01 | LOT-04 | CT-10, CT-26, CT-61, CT-96 | 3/4 passés ; non exécutés : CT-96 | Partiellement couverte |
| EF-27 | EF | Must | BES-01, BES-16 | LOT-03 | CT-62, CT-96, CT-106, CT-118 | 3/4 passés ; non exécutés : CT-96 | Partiellement couverte |
| EF-28 | EF | Must | BES-01 | LOT-02 | CT-10, CT-61, CT-69, CT-82, CT-94, CT-96, CT-106 | 4/7 passés ; non exécutés : CT-69, CT-94, CT-96 | Partiellement couverte |
| EF-29 | EF | Must | 01 § 6 (maintenance), HYP-04, HYP-30 | LOT-05 | CT-66, CT-67, CT-103, CT-104, CT-105, CT-115 | 4/6 passés ; non exécutés : CT-103, CT-115 | Partiellement couverte |
| ENF-01 | ENF | Exigée | 01 § 2, 6, 7 | LOT-05 | CT-63, CT-64, CT-91, CT-93, CT-94, CT-105, CT-115 | 4/7 passés ; non exécutés : CT-93, CT-94, CT-115 | Partiellement couverte |
| ENF-02 | ENF | Exigée | 01 § 2, 6, 7 | LOT-05 | CT-64, CT-93, CT-94 | 1/3 passés ; non exécutés : CT-93, CT-94 | Partiellement couverte |
| ENF-03 | ENF | Exigée | BES-01 | LOT-05 | CT-69, CT-93, CT-94 | 0/3 passés ; non exécutés : CT-69, CT-93, CT-94 | Non couverte |
| ENF-04 | ENF | Exigée | BES-01 | LOT-02 | CT-82, CT-97, CT-111, CT-112, CT-113 | 2/5 passés ; non exécutés : CT-97, CT-112, CT-113 | Partiellement couverte |
| ENF-05 | ENF | Exigée | BES-01 | LOT-02, LOT-05 | CT-83, CT-98 | 1/2 passés ; non exécutés : CT-98 | Partiellement couverte |
| ENF-06 | ENF | Exigée | BES-01 | LOT-02 | CT-84, CT-98 | 1/2 passés ; non exécutés : CT-98 | Partiellement couverte |
| ENF-07 | ENF | Exigée | BES-03 | LOT-02 | CT-13, CT-85, CT-98 | 2/3 passés ; non exécutés : CT-98 | Partiellement couverte |
| ENF-08 | ENF | Exigée | BES-15 | LOT-02, LOT-03, LOT-06 | CT-58, CT-84, CT-98 | 2/3 passés ; non exécutés : CT-98 | Partiellement couverte |
| ENF-09 | ENF | Exigée | BES-01 | LOT-05 | CT-24, CT-65, CT-66, CT-95, CT-104 | 4/5 passés ; non exécutés : CT-95 | Partiellement couverte |
| ENF-10 | ENF | Exigée | BES-01 | LOT-02, LOT-07 | CT-01, CT-02, CT-50, CT-52, CT-100, CT-112, CT-114 | 4/7 passés ; non exécutés : CT-100, CT-112, CT-114 | Partiellement couverte |
| ENF-11 | ENF | Exigée | BES-01, BES-02 | LOT-02, LOT-07, LOT-08 | CT-21, CT-92, CT-100, CT-107, CT-109, CT-117 | 5/6 passés ; non exécutés : CT-100 | Partiellement couverte |
| ENF-12 | ENF | Exigée | BES-02, BES-03 | LOT-02, LOT-08 | CT-13, CT-39, CT-46, CT-59, CT-88, CT-92, CT-97, CT-100, CT-107, CT-108, CT-109, CT-110, CT-111, CT-112, CT-113, CT-117 | 12/16 passés ; non exécutés : CT-97, CT-100, CT-112, CT-113 | Partiellement couverte |
| ENF-13 | ENF | Exigée | 01 § 2, 6, 7 | LOT-01 | CT-02, CT-78, CT-79, CT-87, CT-91, CT-106, CT-117 | 7/7 passés | Couverte |
| ENF-14 | ENF | Exigée | BES-15, 01 § 2, 6, 7 | LOT-03 | CT-36, CT-56, CT-79, CT-80, CT-86, CT-101, CT-116 | 6/7 passés ; non exécutés : CT-101 | Partiellement couverte |
| ENF-15 | ENF | Exigée | BES-15 | LOT-06 | CT-50, CT-51, CT-52, CT-58, CT-102 | 4/5 passés ; non exécutés : CT-102 | Partiellement couverte |
| ENF-16 | ENF | Exigée | BES-15 | LOT-03, LOT-06 | CT-51, CT-55, CT-67, CT-70, CT-78, CT-79, CT-106, CT-116 | 8/8 passés | Couverte |
| ENF-17 | ENF | Exigée | 01 § 2, 6, 7 | LOT-04 | CT-70, CT-72, CT-73, CT-93 | 3/4 passés ; non exécutés : CT-93 | Partiellement couverte |
| ENF-18 | ENF | Exigée | 01 § 2, 6, 7 | LOT-05 | CT-63, CT-64, CT-66, CT-68, CT-77, CT-103, CT-115 | 5/7 passés ; non exécutés : CT-103, CT-115 | Partiellement couverte |
| ENF-19 | ENF | Exigée | 01 § 2, 6, 7 | LOT-01, LOT-02, LOT-07 | CT-90, CT-119 | 2/2 passés | Couverte |
| ENF-20 | ENF | Exigée | BES-01 | LOT-07 | CT-89, CT-101 | 1/2 passés ; non exécutés : CT-101 | Partiellement couverte |
| EXS-01 | EXS | Exigée | Socle (secrets) ; actif clé de signature | LOT-01, LOT-05 | CT-74, CT-122 | 2/2 passés | Couverte |
| EXS-02 | EXS | Exigée | Socle (RGPD, aucun service tiers) ; OBJ-01 ; 01 § 7 | LOT-01, LOT-05 | CT-65, CT-70, CT-71, CT-95 | 3/4 passés ; non exécutés : CT-95 | Partiellement couverte |
| EXS-03 | EXS | Exigée | Actif téléphone des joueurs ; moindre privilège | LOT-04, LOT-06 | CT-71, CT-73, CT-93 | 2/3 passés ; non exécutés : CT-93 | Partiellement couverte |
| EXS-04 | EXS | Exigée | Socle (validation des entrées, désérialisation sûre) ; actif fonction de restauration ; BES-15 | LOT-03, LOT-06 | CT-40, CT-55, CT-57, CT-118, CT-125 | 5/5 passés | Couverte |
| EXS-05 | EXS | Exigée | Socle (désérialisation sûre) ; actif fonction de restauration ; BES-15 | LOT-03, LOT-06 | CT-56, CT-71 | 2/2 passés | Couverte |
| EXS-06 | EXS | Exigée | Socle (encodage des sorties) ; actif saisie du nom ; BES-13 | LOT-01, LOT-03 | CT-40, CT-71 | 2/2 passés | Couverte |
| EXS-07 | EXS | Exigée | Socle (interfaces web) | LOT-01 | CT-72 | 1/1 passé | Couverte |
| EXS-08 | EXS | Exigée | Socle (TLS) ; actif canal de distribution | LOT-05 | CT-64, CT-66, CT-67, CT-76, CT-81, CT-120 | 5/6 passés ; non exécutés : CT-81 | Partiellement couverte |
| EXS-09 | EXS | Exigée | Socle (distribution, SBOM) ; actif canal de distribution | LOT-05 | CT-77, CT-81 | 1/2 passés ; non exécutés : CT-81 | Partiellement couverte |
| EXS-10 | EXS | Exigée | Socle (dépendances) ; actif code et ressources | LOT-01 | CT-63, CT-75, CT-124 | 3/3 passés | Couverte |
| EXS-11 | EXS | Exigée | Socle (CI) | LOT-01, LOT-05 | CT-74, CT-76, CT-124 | 3/3 passés | Couverte |
| EXS-12 | EXS | Exigée | Socle (erreurs) | LOT-03, LOT-06 | CT-51, CT-55, CT-71, CT-79, CT-116, CT-118 | 6/6 passés | Couverte |
| EXS-13 | EXS | Exigée | Socle (fichiers à droits restrictifs, adapté au téléphone ; minimisation) ; actif fichier de sauvegarde | LOT-03, LOT-06 | CT-50, CT-80 | 2/2 passés | Couverte |
| EXS-14 | EXS | Exigée | Actif progression (disponibilité) ; attente de fiabilité du 01 § 6 | LOT-03 | CT-68, CT-80, CT-95, CT-101 | 2/4 passés ; non exécutés : CT-95, CT-101 | Partiellement couverte |
| EXS-15 | EXS | Exigée | Socle (RGPD : information) ; sources de risque fausse version et compte compromis | LOT-05, LOT-06 | CT-68, CT-77, CT-78, CT-91, CT-122, CT-123 | 5/6 passés ; non exécutés : CT-123 | Partiellement couverte |
| EXS-16 | EXS | Exigée | Actif canal de distribution ; source de risque compte compromis | LOT-05 | CT-66, CT-67, CT-76, CT-81, CT-103, CT-120, CT-123, CT-124 | 5/8 passés ; non exécutés : CT-81, CT-103, CT-123 | Partiellement couverte |
| EXS-17 | EXS | Exigée | 04 § 2.4 ; RSK-01, RSK-02, RSK-05, RSK-18 | LOT-01, LOT-03, LOT-05, LOT-06 | CT-118, CT-119, CT-120 | 3/3 passés | Couverte |
| EXS-18 | EXS | Exigée | 04 § 2.4 ; RSK-16 | LOT-01 | CT-121 | 1/1 passé | Couverte |
| EXS-19 | EXS | Exigée | 04 § 2.4 ; RSK-07, RSK-17 | LOT-05 | CT-122, CT-123 | 1/2 passés ; non exécutés : CT-123 | Partiellement couverte |
| EXS-20 | EXS | Exigée | 04 § 2.4 ; RSK-09, RSK-10 | LOT-01, LOT-05 | CT-124 | 1/1 passé | Couverte |

Statut : Couverte (tous ses CT passés) | Partiellement couverte | Non couverte | Écartée (justification).

## Synthèse
| Statut | Nombre |
|---|---|
| Couverte | 30 |
| Partiellement couverte | 38 |
| Non couverte | 1 |
| Écartée | 0 |
| **Total** | **69** (29 EF, 20 ENF, 20 EXS) |

## Lecture de la matrice
- Les 69 exigences ont au moins un lot (06 § 3) et au moins un cas de test (07 § 3) ; aucun cas de test n'est en échec (08 : 107 passés, 0 échec, 18 non exécutés).
- Par type : EF 15 couvertes et 14 partiellement couvertes ; ENF 3 couvertes, 16 partiellement couvertes et 1 non couverte ; EXS 12 couvertes et 8 partiellement couvertes.
- Par priorité des EF : Must 7 couvertes et 14 partiellement couvertes ; Should 7 couvertes sur 7 ; Could 1 couverte sur 1. Chaque EF Must a au moins un cas de test passé dans un navigateur ou sur le moteur ; la part restante tient aux appareils réels.
- Toutes les couvertures partielles, et la non-couverture d'ENF-03, tiennent aux 18 CT non exécutés : CT-69 (WebKit, joué par l'intégration continue du dépôt), CT-81 et CT-123 (publication réelle), CT-93 à CT-103 et CT-112 à CT-115 (téléphones réels, personnes extérieures). ENF-03 (compatibilité Android 12 et iOS 17) n'est démontrée que par les profils Chromium simulés, qui ne sont pas rattachés à ENF-03 dans 07 : elle reste à prouver par CT-69, CT-93 et CT-94.
- Aucune exigence n'est écartée.

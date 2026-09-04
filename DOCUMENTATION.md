# 📖 DOCUMENTATION COMPLÈTE DU SYSTÈME KOTASCHOOL
### Plateforme Intégrée de Gestion Pédagogique, Délibérations et Bulletins Scolaires Officiels (EPSP — RDC)

---

## 📑 Sommaire

1. [Introduction & Vision du Projet](#1-introduction--vision-du-projet)
2. [Architecture Technique Globale](#2-architecture-technique-globale)
3. [Structure Académique & Pédagogique (Norme RDC EPSP)](#3-structure-académique--pédagogique-norme-rdc-epsp)
4. [Gestion des Rôles & Contrôle d'Accès (RBAC)](#4-gestion-des-rôles--contrôle-daccès-rbac)
5. [Cycle de Vie des Évaluations & Règles de Calcul Mathématique](#5-cycle-de-vie-des-évaluations--règles-de-calcul-mathématique)
6. [Système d'Impression & Génération des Bulletins PDF](#6-système-dimpression--génération-des-bulletins-pdf)
7. [Schéma et Modèle de Données (Prisma ORM & PostgreSQL)](#7-schéma-et-modèle-de-données-prisma-orm--postgresql)
8. [Spécification Complète des API REST (Backend)](#8-spécification-complète-des-api-rest-backend)
9. [Interface Utilisateur & Modules Frontend (Next.js)](#9-interface-utilisateur--modules-frontend-nextjs)
10. [Guide d'Installation, Déploiement & Données de Test (Seed)](#10-guide-dinstallation-déploiement--données-de-test-seed)
11. [Sécurité, Intégrité des Données & Bonnes Pratiques](#11-sécurité-intégrité-des-données--bonnes-pratiques)
12. [Feuille de Route & Évolutions Futures](#12-feuille-de-route--évolutions-futures)

---

## 1. Introduction & Vision du Projet

### 1.1. Contexte et Raison d'Être
Dans de nombreux établissements d'enseignement primaire, secondaire et technique en République Démocratique du Congo (EPSP / Ministère de l'Éducation Nationale), la gestion administrative et académique repose encore sur des supports papier ou des tableurs dispersés. Cette méthode engendre des difficultés majeures :
- **Risques élevés d'erreurs de calcul** : calculs manuels des moyennes pondérées par coefficients, examens comptant double, pourcentages et classements de fin d'année.
- **Opacité et falsification** : manipulation possible des notes avant ou après les conseils de délibération.
- **Lenteur administrative** : des semaines de délai pour publier les palmarès et éditer les bulletins physiques.
- **Perte d'informations historiques** : complexité pour reconstituer le parcours antérieur d'un élève.

### 1.2. La Solution Kotaschool
**Kotaschool** est une solution numérique de bout en bout conçue pour digitaliser, sécuriser et automatiser l'intégralité de la chaîne de valeur pédagogique d'une école :
1. Gestion unifiée des inscriptions annuelles et matricules uniques.
2. Définition rigoureuse de la structure scolaire (sections, options, classes, matières et coefficients).
3. Affectation précise des enseignants à leurs charges de cours respectives.
4. Saisie ergonomique des notes avec enregistrement en brouillon.
5. Verrouillage et validation stricte par l'Administrateur.
6. Moteur de calcul automatisé des bulletins de période, de semestre et annuels.
7. Génération de bulletins certifiés au format officiel EPSP (impression A4 et PDF haute fidélité).
8. Accès en direct pour les élèves et parents à leurs performances scolaires.

---

## 2. Architecture Technique Globale

Le projet est conçu selon une architecture moderne découplée (API-First), séparant le cœur métier et la persistance des données de l'interface utilisateur.

```
┌──────────────────────────────────────────────────────────────────┐
│                   NAVIGATEURS CLIENTS / WEB APP                 │
│         (Next.js 15, React 19, Tailwind CSS, Lucide Icons)       │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ HTTPS / REST (JSON)
                                  │ Headers: Authorization Bearer <JWT>
┌─────────────────────────────────▼────────────────────────────────┐
│                     BACKEND API REST (NestJS 11)                 │
│  ├── Auth Module (JWT, Passport, Guards RBAC)                    │
│  ├── Administration Module (Structure, Inscriptions, Classes)   │
│  ├── Notes Module (Saisie, Validation, Délibérations, Calcul)   │
│  └── Common (Prisma Exception Filters, Validation Pipes)         │
└─────────────────────────────────┬────────────────────────────────┘
                                  │ Prisma ORM 6 (TypeScript Engine)
                                  │ Connection Pooling
┌─────────────────────────────────▼────────────────────────────────┐
│                   BASE DE DONNÉES POSTGRESQL 16                  │
│     (Relations strictes, Contraintes d'intégrité, Types Enums)   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1. Technologies Clés

| Composant | Technologie | Rôle dans le projet |
|---|---|---|
| **Backend Framework** | **NestJS 11** | Framework TypeScript modulaire, architecture en couches (Controllers, Services, DTOs, Guards). |
| **ORM / Accès Données** | **Prisma 6** | Typage statique de bout en bout, migrations versionnées, requêtes optimisées sans SQL brut vulnérable. |
| **Base de Données** | **PostgreSQL 16** | SGBD relationnel assurant l'intégrité référentielle ACID, les index d'unicité et le stockage haute performance. |
| **Frontend Framework** | **Next.js 15 (App Router)** | Rendu hybride rapide, routage basé sur les répertoires, sécurité et modularité. |
| **Bibliothèque UI** | **React 19** | Gestion de l'état réactif et interfaces riches. |
| **Moteur de Style** | **Tailwind CSS 3** | Design moderne, palette soignée (`brand-*`), design responsive mobile/desktop et styles d'impression papier `@media print`. |
| **Gestion d'État Client** | **Zustand** | Store léger avec persistance locale (`localStorage`) et hydratation asynchrone sécurisée. |
| **Visualisations / Charts** | **Chart.js & D3.js** | Diagrammes circulaires des sections, histogrammes d'activité et arbre interactif hiérarchique de l'école. |
| **Génération Documentaire** | **jsPDF & autoTable** | Génération autonome côté client de bulletins PDF conformes aux maquettes ministérielles. |

---

## 3. Structure Académique & Pédagogique (Norme RDC EPSP)

Le système Kotaschool modélise fidèlement l'organisation de l'enseignement secondaire en République Démocratique du Congo :

### 3.1. Arborescence Structurelle

```
Établissement (Kotaschool)
│
├── 📂 Section Scientifique
│   └── 🔬 Option Sciences
│       ├── 1ère Sciences (1ère année des Humanités Scientifiques)
│       ├── 2ème Sciences (2ème année des Humanités Scientifiques)
│       ├── 3ème Sciences (3ème année des Humanités Scientifiques)
│       └── 4ème Sciences (4ème année des Humanités Scientifiques)
│
└── 📂 Section Commerciale et Gestion
    └── 🏦 Option Commerciale et Gestion
        ├── 1ère Commerciale
        ├── 2ème Commerciale
        ├── 3ème Commerciale
        └── 4ème Commerciale
```

### 3.2. Périodisation Temporelle
Une année scolaire (ex. `2026–2027`) est divisée en **deux semestres** académiques, chacun décomposé en **deux périodes** d'évaluation continue, complétées par une session d'examens semestriels :

- **Semestre 1** :
  - *Première Période (P1)* : travaux pratiques, devoirs et interrogations formatives.
  - *Deuxième Période (P2)* : travaux journaliers et évaluations d'étape.
  - *Examen du 1er Semestre* : synthèse récapitulative semestrielle sans période rattachée (`idPeriode = null`).
- **Semestre 2** :
  - *Troisième Période (P3)* : évaluations du début de second semestre.
  - *Quatrième Période (P4)* : dernières évaluations continues de l'année.
  - *Examen du 2ème Semestre* : grand examen final.

### 3.3. Matières et Coefficients par Classe
Chaque classe possède son propre plan d'études défini dans la table `ClasseMatiere`. Le coefficient pondère l'importance de la matière au bulletin :
- **Section Scientifique** : Mathématiques (coef 4), Physique (coef 3), Chimie (coef 3), Biologie (coef 2), Français (coef 3), Informatique (coef 2), Anglais (coef 2), etc.
- **Section Commerciale** : Comptabilité (coef 4), Mathématiques Financières (coef 3), Économie Générale (coef 3), Droit & Législation (coef 2), etc.

---

## 4. Gestion des Rôles & Contrôle d'Accès (RBAC)

Kotaschool intègre un système complet de sécurité basé sur les rôles (Role-Based Access Control). Chaque utilisateur est rattaché à un profil précis qui détermine strictement ce qu'il peut voir et exécuter.

| Rôle Système | Code | Responsabilités & Périmètre d'Action |
|---|---|---|
| **Administrateur** | `ADMIN` | Superviseur global. Gestion des comptes utilisateurs, activation de l'année scolaire, création des classes/matières, administration, validation officielle des notes, délibérations et accès sans restriction. |
| **Enseignant** | `TEACHER` | Accès restreint à ses propres affectations (classes et matières attribuées). Création d'évaluations, saisie des notes en brouillon et soumission pour validation officielle. |
| **Élève / Parent** | `STUDENT` | Consultation en temps réel des notes obtenues par période, suivi de progression graphique et téléchargement de ses bulletins officiels certifiés. |

### 4.1. Matrice des Droits d'Accès aux Écrans

| Route Frontend | Fonctionnalité | `ADMIN` | `TEACHER` | `STUDENT` |
|---|---|:---:|:---:|:---:|
| `/dashboard` | Tableau de bord avec métriques adaptées au rôle | ✅ | ✅ | ✅ |
| `/students` | Répertoire des élèves & inscriptions annuelles | ✅ | ❌ | ❌ |
| `/teachers` | Fiches du corps professoral | ✅ | ❌ | ❌ |
| `/academic` | Arbre académique, classes, matières & coefficients | ✅ | ❌ | ❌ |
| `/assignments` | Affectation des enseignants aux classes/matières | ✅ | ❌ | ❌ |
| `/grades/entry` | Saisie des notes d'évaluations | ❌ | ✅ | ❌ |
| `/grades/validation`| Validation et verrouillage officiel des évaluations | ✅ | ❌ | ❌ |
| `/reports` | Calcul des délibérations, palmarès & bulletins officiels | ✅ | ❌ | ❌ |
| `/grades/my-scores` | Consultation des notes en direct de l'élève | ❌ | ❌ | ✅ |
| `/grades/my-notes` | Visualisation et téléchargement des bulletins élève | ❌ | ❌ | ✅ |

---

## 5. Cycle de Vie des Évaluations & Règles de Calcul Mathématique

Le traitement des notes dans Kotaschool suit un protocole anti-fraude rigoureux avant d'aboutir au calcul mathématique officiel du bulletin.

### 5.1. Les 3 Statuts d'une Évaluation

```mermaid
stateDiagram-v2
    [*] --> BROUILLON : Enseignant crée et saisit la grille
    BROUILLON --> BROUILLON : Modifications libres des notes
    BROUILLON --> SOUMISE : Enseignant clique "Soumettre pour validation"
    SOUMISE --> VALIDEE : Administrateur clique "Valider & Verrouiller"
    VALIDEE --> [*] : Prise en compte dans le calcul des bulletins
```

1. **`BROUILLON`** : L'enseignant saisit les notes. Il peut enregistrer, corriger ou laisser des cellules vides sans impacter les moyennes globales.
2. **`SOUMISE`** : L'enseignant a terminé sa saisie et transmet l'évaluation pour validation officielle. La grille devient non modifiable pour l'enseignant.
3. **`VALIDEE`** : L'Administrateur vérifie la conformité et valide l'évaluation. La note est estampillée avec `estValide = true`, l'identifiant du validateur et la date exacte. Seules les notes validées entrent dans le calcul des bulletins.

---

### 5.2. Formules Mathématiques Officielles (Réglementation EPSP)

#### A. Note de Période par Matière (sur 20)
Pour une période donnée (ex. P1), un élève peut avoir plusieurs évaluations d'étape (interrogations de pondération 1, devoirs de pondération 1, TP de pondération 1, etc.).

$$\text{NotePériode} = \frac{\sum_{i=1}^{n} \left( \frac{\text{Note}_i}{\text{Maximum}_i} \times 20 \times \text{Pondération}_i \right)}{\sum_{i=1}^{n} \text{Pondération}_i}$$

*Exemple : Un élève a 15/20 à une interrogation (pond. 1) et 18/20 à un TP (pond. 1) :*
$$\text{NotePériode} = \frac{(15 \times 1) + (18 \times 1)}{1 + 1} = \frac{33}{2} = 16.5 / 20$$

---

#### B. Note Semestrielle par Matière (sur 20)
Conformément aux directives officielles en RDC, la note d'examen semestriel compte **double** par rapport à une note de période continue. De plus, si une période n'a pas encore eu d'évaluation, elle n'est pas comptabilisée comme zéro afin de ne pas pénaliser indûment l'élève.

$$\text{NoteSemestre} = \frac{\sum \text{Notes des Périodes Évaluées} + 2 \times \sum \text{Notes des Examens}}{\text{Nombre de Périodes Évaluées} + 2 \times \text{Nombre d'Examens}}$$

---

#### C. Note au Bulletin pour la Matière
Chaque matière possède un coefficient d'importance défini pour la classe de l'élève (table `ClasseMatiere`). La note semestrielle est multipliée par ce coefficient :

$$\text{NoteBulletin} = \text{NoteSemestre} \times \text{Coefficient}$$
$$\text{MaximumMatière} = 20 \times \text{Coefficient}$$

*Exemple : Mathématiques (coef 4) avec une note semestrielle de 14.5/20 :*
$$\text{NoteBulletin} = 14.5 \times 4 = 58 \quad \text{sur un maximum de} \quad 20 \times 4 = 80$$

---

#### D. Total Général, Pourcentage & Rang de Classe
Le bulletin consolide l'ensemble des matières de la classe :

$$\text{TotalObtenu} = \sum \text{NoteBulletin}$$
$$\text{TotalMaximum} = \sum \text{MaximumMatière}$$
$$\text{Pourcentage} = \left( \frac{\text{TotalObtenu}}{\text{TotalMaximum}} \right) \times 100$$

Le **Rang** est calculé automatiquement en classant tous les élèves de la même classe par ordre décroissant de leur pourcentage semestriel ou annuel.

---

#### E. Décisions & Mentions Pédagogiques

| Pourcentage Obtenu | Mention Officielle | Décision |
|---|---|---|
| **≥ 80.00 %** | **Grande Distinction** | Réussi / Admis |
| **70.00 % – 79.99 %** | **Distinction** | Réussi / Admis |
| **60.00 % – 69.99 %** | **Satisfaction** | Réussi / Admis |
| **50.00 % – 59.99 %** | **Réussi** | Réussi / Admis |
| **< 50.00 %** | **Non réussi** | Ajourné / Échec |

---

## 6. Système d'Impression & Génération des Bulletins PDF

Le système Kotaschool offre une double méthode de production des bulletins pour répondre à toutes les situations :

### 6.1. Impression Directe Haute Fidélité (`printBulletin`)
- Ouvre une fenêtre d'impression optimisée au standard mondial **A4 portrait (210mm × 297mm)**.
- Intègre une feuille de style dédiée `@media print` garantissant l'exactitude des couleurs et le masquage des éléments de navigation de l'application.
- **Présentation visuelle** :
  - En-tête officiel : nom de l'établissement, mention du système EPSP, titre du bulletin et année scolaire active.
  - Fiche de l'élève : encart structuré avec nom complet, matricule, classe, option et section.
  - Grille détaillée des matières avec colonnes *Matière*, *Coefficient*, *Note sur 20*, et *Note finale pondérée*.
  - Bloc récapitulatif : Total obtenu / Total maximum, Pourcentage, Rang de la classe et Décision du jury en badge coloré.
  - Trois blocs de signature : Le Chef d'Établissement, Le Secrétaire Pédagogique, et Le Titulaire de Classe.
  - Bas de page avec date de délivrance et clause d'authenticité.

### 6.2. Téléchargement PDF Vectoriel Côté Client (`downloadPdf`)
- Généré directement par le navigateur via les bibliothèques **jsPDF** et **jspdf-autotable** sans surcharger le serveur d'API.
- Génère un fichier PDF vectoriel léger, haute résolution et immédiatement téléchargeable sous la nomenclature standardisée : `bulletin_NOM_PRENOM_SEMESTRE.pdf`.

---

## 7. Schéma et Modèle de Données (Prisma ORM & PostgreSQL)

Le fichier [`kotaschool-backend/prisma/schema.prisma`](kotaschool-backend/prisma/schema.prisma) constitue la source de vérité pour le schéma relationnel de la base de données.

```mermaid
erDiagram
    Utilisateur ||--o{ Role : "possede"
    Utilisateur ||--o| Enseignant : "compte de"
    Utilisateur ||--o| Eleve : "compte de"
    
    Section ||--o{ Option : "regroupe"
    Option ||--o{ Classe : "contient"
    
    Classe ||--o{ ClasseMatiere : "possede"
    Matiere ||--o{ ClasseMatiere : "est attribuee a"
    
    AnneeScolaire ||--o{ Semestre : "divisee en"
    Semestre ||--o{ Periode : "compose de"
    
    Eleve ||--o{ Inscription : "inscrit via"
    Classe ||--o{ Inscription : "accueille"
    AnneeScolaire ||--o{ Inscription : "concerne"
    
    Enseignant ||--o{ Affectation : "est affecte a"
    ClasseMatiere ||--o{ Affectation : "charge de cours"
    AnneeScolaire ||--o{ Affectation : "annee de validite"
    
    Affectation ||--o{ Evaluation : "evalue via"
    TypeEvaluation ||--o{ Evaluation : "nature de l'evaluation"
    Periode ||--o{ Evaluation : "periode de"
    Semestre ||--o{ Evaluation : "semestre de"
    
    Inscription ||--o{ Note : "obtient"
    Evaluation ||--o{ Note : "recoit la note"
    
    Inscription ||--o{ Bulletin : "possede"
    Semestre ||--o{ Bulletin : "relatif a"
```

### 7.1. Tables Principales et Leurs Attributs

#### `Utilisateur` & `Role`
- `id` (UUID), `nomUtilisateur`, `email`, `motDePasse` (hash bcrypt), `idRole` (Foreign Key vers `Role`), `enseignantId` (nullable), `eleveId` (nullable), `estActif` (booléen).
- Rôles : `ADMIN`, `TEACHER`, `STUDENT`.

#### `Section`, `Option` & `Classe`
- `Section` : regroupe les grandes filières (ex. *Scientifique*, *Commerciale et Gestion*).
- `Option` : sous-branche pédagogique (ex. *Sciences*, *Commerciale et Gestion*).
- `Classe` : entité concrète accueillant les élèves (`libelle`: *1ère Sciences*, `niveau`: *1ère*, rattachée à son `idOption`).

#### `Matiere` & `ClasseMatiere`
- `Matiere` : libellé du cours (ex. *Mathématiques*, *Physique*, *Chimie*, *Comptabilité*).
- `ClasseMatiere` : table de liaison qui fixe le `coefficient` décimal de la matière pour une classe donnée.

#### `Eleve` & `Inscription`
- `Eleve` : données d'état civil de l'apprenant (`matricule` unique ex. `KOT-2026-001`, `nom`, `postnom`, `prenom`, `sexe`, `dateNaissance`, `lieuNaissance`, `adresse`).
- `Inscription` : enregistrement de l'élève pour une classe précise lors d'une année scolaire précise (`idEleve`, `idClasse`, `idAnnee`). Un élève ne peut avoir qu'une seule inscription par année scolaire (`@@unique([matricule, idAnnee])`).

#### `Affectation`
- Rapprochement opérationnel : un `Enseignant` est assigné à une `ClasseMatiere` pour une `AnneeScolaire`. Un enseignant ne peut noter que les élèves des affectations qui lui ont été explicitement attribuées.

#### `Evaluation` & `TypeEvaluation`
- `TypeEvaluation` : nature de l'épreuve (*Interrogation*, *Devoir*, *Travail Pratique*, *Examen*) avec sa `ponderation`.
- `Evaluation` : épreuve planifiée (`libelle`, `maximum` fixé généralement à 20, `ponderation`, `dateEvaluation`, `statut` [BROUILLON, SOUMISE, VALIDEE], rattachée à l'`Affectation`, au `Semestre` et optionnellement à la `Periode`).

#### `Note`
- La note atomique obtenue par l'élève : `idInscription`, `idEvaluation`, `valeurNote` (décimal), `observation`, `estValide` (booléen de verrouillage), `valideParId`, `dateValidation`. Contrainte d'unicité stricte : une seule note par couple inscription × évaluation (`@@unique([idInscription, idEvaluation])`).

#### `Bulletin`
- Les résultats calculés et stockés : `type` (`SEMESTRE` ou `ANNUEL`), `totalObtenu`, `totalMaximum`, `pourcentage`, `rang`, `decision`, rattaché à l'`Inscription`, au `Semestre` et à l'`AnneeScolaire`.

---

## 8. Spécification Complète des API REST (Backend)

L'API REST est préfixée par `/api/v1` et s'exécute par défaut sur le port `4000`.

### 8.1. Module Authentification (`/auth`)

| Méthode | Route | Accès | Paramètres / Corps (Body) | Réponse / Description |
|---|---|---|---|---|
| `POST` | `/auth/login` | Public | `{ "nomUtilisateur": "...", "motDePasse": "..." }` | Retourne `{ "accessToken": "jwt...", "user": { ... } }`. |
| `GET` | `/auth/me` | Authentifié | Aucun | Renvoie le profil et le rôle de l'utilisateur courant connecté. |

---

### 8.2. Module Administration (`/administration`)

| Méthode | Route | Rôles Autorisés | Description |
|---|---|---|---|
| `GET` | `/administration/catalogue` | Tous authentifiés | Retourne l'ensemble de l'arbre académique (sections, options, classes, matières, enseignants). |
| `GET` | `/administration/students` | `ADMIN` | Liste complète des élèves enregistrés et de leurs inscriptions. |
| `POST` | `/administration/students` | `ADMIN` | Crée la fiche signalétique d'un nouvel élève avec son matricule. |
| `POST` | `/administration/enrolments` | `ADMIN` | Inscrit un élève dans une classe pour l'année scolaire active. |
| `GET` | `/administration/teachers` | `ADMIN` | Liste des enseignants en service. |
| `POST` | `/administration/teachers` | `ADMIN` | Enregistre un nouvel enseignant et prépare son compte d'accès. |
| `GET` | `/administration/assignments` | `ADMIN` | Liste de toutes les affectations de l'année. |
| `POST` | `/administration/assignments` | `ADMIN` | Attribue une charge de cours (classe + matière) à un enseignant. |
| `GET` | `/administration/my-assignments`| `TEACHER` | Retourne uniquement les affectations de l'enseignant connecté. |

---

### 8.3. Module Notes, Délibérations & Bulletins (`/notes`)

| Méthode | Route | Rôles Autorisés | Description |
|---|---|---|---|
| `GET` | `/notes/context` | `TEACHER` | Contexte complet de saisie pour l'enseignant (affectations, périodes actives, types d'épreuves). |
| `POST` | `/notes/evaluations` | `TEACHER` | Crée une nouvelle évaluation en statut `BROUILLON`. |
| `POST` | `/notes/batch` | `TEACHER` | Enregistrement par lot des notes saisies dans la grille (mode brouillon). |
| `POST` | `/notes/evaluations/:id/soumettre` | `TEACHER` | Soumet l'évaluation pour validation officielle (statut `SOUMISE`). |
| `GET` | `/notes/grille/:id` | `TEACHER`, `ADMIN` | Affiche la grille complète d'une évaluation (élèves, notes et statuts). |
| `GET` | `/notes/validations` | `ADMIN` | Liste toutes les évaluations soumises en attente d'approbation. |
| `POST` | `/notes/validations/:id/valider` | `ADMIN` | Approuve et verrouille l'évaluation (statut `VALIDEE`). |
| `POST` | `/notes/bulletins/semestre/:id/calculer` | `ADMIN` | Déclenche le recalcul automatique des bulletins et des rangs pour un semestre. |
| `GET` | `/notes/reports/semestres` | `ADMIN` | Liste les semestres scolaires disponibles pour l'édition des palmarès. |
| `GET` | `/notes/reports/semestre/:id` | `ADMIN` | Renvoie le palmarès officiel de la promotion (liste des élèves classés avec pourcentages). |
| `GET` | `/notes/reports/inscription/:insId/semestre/:semId` | `ADMIN` | Renvoie les données détaillées d'un bulletin individuel (matière par matière, coefs, notes). |

---

## 9. Interface Utilisateur & Modules Frontend (Next.js)

L'application Web frontend (`kotaschool-frontend`) s'exécute par défaut sur le port `3000`. Elle propose une interface ultra-moderne conçue pour faciliter l'adoption par le personnel éducatif et les élèves :

### 9.1. Tableau de Bord Dynamique (`/dashboard`)
Le tableau de bord s'adapte automatiquement selon l'identité de l'utilisateur connecté :
- **Pour l'Administrateur** :
  - Métriques clés (élèves inscrits, enseignants en poste, cours au programme, affectations).
  - Compteur des évaluations en attente de validation et accès direct au sas de validation et aux délibérations.
  - Graphiques interactifs Chart.js (répartition des effectifs par section, barres d'activité).
  - **Arbre Hiérarchique D3.js** représentant graphiquement l'organisation de l'école (Sections ➔ Options ➔ Classes).
  - Boutons d'accès direct à l'inscription et aux palmarès.
- **Pour l'Enseignant** :
  - Vue synthétique de ses affectations actives.
  - Cartes d'accès rapide à la grille de saisie pour chaque classe/matière.
  - Raccourci vers la saisie des notes.
- **Pour l'Élève** :
  - Synthèse de ses notes récentes, graphique d'évolution et accès à ses bulletins certifiés.

### 9.2. Module Saisie des Notes (`/grades/entry`)
- Sélecteur en cascade intuitif : Affectation ➔ Évaluation existante ou Nouvelle évaluation.
- Grille de saisie matricielle fluide avec navigation clavier, calcul d'indicateurs visuels et gestion des cellules vides.
- Boutons d'action clairs : *Enregistrer en brouillon* (sauvegarde intermédiaire) et *Soumettre pour validation* (verrouillage et transmission).

### 9.3. Module Validation Pédagogique (`/grades/validation`)
- Liste organisée des évaluations transmises par les professeurs.
- Inspection de la grille de notes avec statistiques de distribution (moyenne de la classe, note min, note max).
- Bouton sécurisé *Valider et Verrouiller* qui certifie les notes.

### 9.4. Module Palmarès & Bulletins (`/reports`)
- Choix du semestre ou de l'année.
- Bouton *Recalculer le classement* : exécute en quelques millisecondes le calcul des délibérations pour des centaines d'élèves.
- Tableau de classement officiel affichant le rang, le pourcentage, le total de points et la décision du jury.
- Fiche de prévisualisation individuelle avec boutons d'export :
  - **Bouton « Imprimer le bulletin »** : déclenche le dialogue d'impression A4 standardisé avec le style officiel du Ministère.
  - **Bouton « Télécharger le PDF »** : génère instantanément le document officiel sur l'ordinateur de l'utilisateur.

---

## 10. Guide d'Installation, Déploiement & Données de Test (Seed)

### 10.1. Prérequis Système
- **Node.js** : version LTS recommandée (≥ 20.x).
- **Docker & Docker Desktop** (optionnel mais recommandé pour exécuter PostgreSQL sans configuration manuelle).
- **PostgreSQL 16** (si installation locale sans Docker).

---

### 10.2. Déploiement du Backend (`kotaschool-backend`)

#### Méthode A : Avec Docker Compose (Recommandé)
```bash
cd kotaschool-backend

# 1. Lancer les conteneurs PostgreSQL (port 5433) et l'API (port 4000)
docker compose up -d --build

# 2. Appliquer les migrations de base de données
docker compose exec api npx prisma migrate deploy

# 3. Injecter le jeu complet de données de démonstration
docker compose exec api npm run prisma:seed
```

#### Méthode B : Installation Locale Standard
```bash
cd kotaschool-backend

# 1. Installer les dépendances
npm install

# 2. Configurer le fichier d'environnement .env
# Vérifier la chaîne DATABASE_URL (ex: postgresql://kotaschool:kotaschool@localhost:5433/kotaschool?schema=public)

# 3. Générer le client Prisma et exécuter les migrations
npx prisma generate
npx prisma migrate deploy

# 4. Peupler la base avec les données massives
npm run prisma:seed

# 5. Démarrer le serveur d'API en mode développement
npm run start:dev
```
L'API est alors opérationnelle sur `http://localhost:4000/api/v1` (vérifiable via `http://localhost:4000/api/v1/health`).

---

### 10.3. Déploiement du Frontend (`kotaschool-frontend`)

```bash
cd kotaschool-frontend

# 1. Installer les dépendances
npm install

# 2. Vérifier le fichier .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# 3. Lancer le serveur de développement
npm run dev
```
L'application Web est accessible sur `http://localhost:3000`.

---

### 10.4. Données de Test & Comptes Pré-Générés (Seed)

Le script de seed (`kotaschool-backend/prisma/seed.ts`) configure automatiquement un environnement scolaire complet, réaliste et prêt pour les démonstrations :

#### 👤 Comptes d'Accès

| Type de Compte | Identifiant (Email / Login) | Mot de passe | Rôle Associé |
|---|---|---|---|
| **Administrateur Général** | `fordimalanda7@gmail.com` | `MALANDA100` | `ADMIN` |
| **Enseignants (25 profs)** | `jean.kabamba@kotaschool.cd`<br>`sarah.mboyo@kotaschool.cd`<br>`patrick.bakambamba@kotaschool.cd`<br>*(...voir liste complète dans seed)* | `prof` | `TEACHER` |
| **Élèves (~150 élèves)** | Matricule (ex: `KOT-2026-001`) ou email généré (ex: `gloria.mbombo.beya@kotaschool.cd`) | `student` | `STUDENT` |

#### 🏫 Contenu Déjà Pré-Calculé
- Année scolaire active : **2026–2027**.
- 2 Sections, 2 Options, et **8 Classes actives** :
  - *1ère Sciences, 2ème Sciences, 3ème Sciences, 4ème Sciences*
  - *1ère Commerciale, 2ème Commerciale, 3ème Commerciale, 4ème Commerciale*
- Couverture à 100 % des affectations enseignants sur toutes les matières.
- Des milliers de notes validées réparties sur les semestres 1 et 2 (P1, P2, P3, P4 et examens).
- Tous les bulletins semestriels et annuels pré-calculés avec pourcentages réels, rangs et décisions du jury conformes aux standards congolais.

---

## 11. Sécurité, Intégrité des Données & Bonnes Pratiques

### 11.1. Sécurité des Mots de Passe & Sessions
- Tous les mots de passe sont hachés avec l'algorithme **bcrypt** avec un coût de salage de 10 tours (`saltRounds = 10`). Aucun mot de passe en clair n'est stocké en base de données.
- Les échanges authentifiés s'effectuent par jetons **JSON Web Tokens (JWT)** signés avec un secret d'environnement (`JWT_SECRET`) et disposant d'une durée de validité limitée.
- Les intercepteurs Axios injectent automatiquement le token Bearer dans les en-têtes HTTP de chaque requête.

### 11.2. Intégrité des Données
- Le modèle de données s'appuie sur des contraintes d'unicité strictes au niveau de PostgreSQL :
  - Impossibilité pour un élève d'avoir deux inscriptions pour la même année scolaire.
  - Impossibilité d'enregistrer deux fois une note pour un même couple élève–évaluation.
  - Vérification systématique côté backend de l'appartenance de l'affectation à l'enseignant qui effectue la saisie.

### 11.3. Protection contre les Injections & Erreurs
- L'utilisation de Prisma ORM protège nativement contre les injections SQL grâce à la paramétrisation systématique des requêtes.
- Les requêtes entrantes sont filtrées et validées par les pipes NestJS (`ValidationPipe` avec `whitelist: true` et `transform: true`).
- Les filtres d'exception personnalisés (`PrismaClientExceptionFilter`) interceptent les erreurs de contrainte d'unicité (P2002) ou d'entité introuvable (P2025) pour renvoyer des messages d'erreur HTTP clairs et compréhensibles (`409 Conflict`, `404 Not Found`).

---

## 12. Feuille de Route & Évolutions Futures

Le projet Kotaschool a été pensé pour pouvoir évoluer facilement vers de nouveaux modules à forte valeur ajoutée :

1. **Portail Mobile Spécifique pour les Parents d'Élèves (PWA)** :
   - Consultation instantanée des présences, des absences et des retards.
   - Suivi régulier des notes dès leur validation par l'école.
2. **Module de Gestion des Frais Scolaires (Minerval)** :
   - Suivi des paiements, des échéances et des soldes par élève.
   - Blocage ou déblocage conditionnel de la délivrance des bulletins officiels selon l'état d'apurement financier.
3. **Passerelle de Notification SMS / WhatsApp** :
   - Envoi automatique d'un SMS ou message WhatsApp aux parents lors de la publication des bulletins ou pour convocation aux réunions pédagogiques.
4. **Sécurisation par QR Code Dynamique sur les Bulletins** :
   - Intégration sur chaque bulletin imprimé d'un QR Code sécurisé et scellé cryptographiquement, permettant à toute université ou employeur de vérifier l'authenticité du document officiel en ligne sur la plateforme Kotaschool.

---

> **Kotaschool — L'Excellence Numérique au Service de l'Éducation en République Démocratique du Congo.**  
> *Documentation officielle du système · Conforme aux directives du Ministère de l'EPSP / MINEPST.*

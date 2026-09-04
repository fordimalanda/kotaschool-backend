# Kotaschool — API (Backend)

API REST du système **Kotaschool** : gestion scolaire, saisie/validation des notes et calcul des bulletins pour le système éducatif de la RDC (EPSP).

- Base URL : `http://localhost:4000/api/v1`
- Santé : `GET /api/v1/health`
- Frontend associé : [`../kotaschool-frontend`](../kotaschool-frontend/README.md)

---

## 🧰 Stack

- **NestJS 11** (TypeScript) — API modulaire
- **PostgreSQL 16** — base de données
- **Prisma ORM 6** — accès données, migrations, seed
- **Passport JWT** — authentification (Bearer token)
- **class-validator / class-transformer** — validation des DTO
- **Docker Compose** — PostgreSQL + API (mode watch)

---

## 📁 Structure du code

```
src/
├── main.ts                        # Bootstrap : prefix /api/v1, CORS, pipes, filtres
├── app.module.ts                  # Module racine
├── health.controller.ts           # GET /health
├── common/
│   └── prisma-exception.filter.ts # P2002 → 409, P2025 → 404 (messages lisibles)
├── database/
│   ├── database.module.ts
│   └── prisma.service.ts          # PrismaClient (module global)
├── auth/                          # Authentification & autorisations
│   ├── auth.controller.ts         # POST /auth/login, GET /auth/me
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── jwt.strategy.ts
│   ├── jwt-auth.guard.ts          # Vérifie le JWT
│   ├── roles.guard.ts             # Vérifie les @Roles
│   ├── roles.decorator.ts
│   ├── roles.enum.ts              # ADMIN, TEACHER, STUDENT
│   └── dto/login.dto.ts
├── administration/                # Structure, acteurs, affectations, inscriptions
│   ├── administration.controller.ts
│   ├── administration.service.ts
│   └── administration.module.ts
└── notes/                         # Évaluations, notes, validation, bulletins
    ├── notes.controller.ts
    ├── notes.service.ts           # Calculs (périodes, semestres, bulletins, rang)
    ├── notes.module.ts
    └── dto/
        ├── create-evaluation.dto.ts
        └── save-notes.dto.ts
```

---

## 🗄️ Modèle de données (Prisma)

Fichier : [`prisma/schema.prisma`](./prisma/schema.prisma)

### Énumérations

| Énum | Valeurs |
|---|---|
| `CodeRole` | `ADMIN`, `TEACHER`, `STUDENT` |
| `Sexe` | `M`, `F` |
| `StatutEvaluation` | `BROUILLON`, `SOUMISE`, `VALIDEE` |
| `TypeBulletin` | `PERIODE`, `SEMESTRE`, `ANNUEL` |

### Entités principales

| Modèle | Rôle |
|---|---|
| `Role`, `Utilisateur` | Utilisateurs et profils (soft delete `estActif`/`supprimeLe`) |
| `Section → Option → Classe` | Structure pédagogique |
| `AnneeScolaire → Semestre → Periode` | Découpage temporel (une année active) |
| `Matiere`, `ClasseMatiere` | Matières et **coefficient par classe** |
| `Eleve`, `Enseignant`, `Inscription` | Acteurs + inscription annuelle (unique par `matricule × année`) |
| `Affectation` | Enseignant ↔ (classe, matière) par année |
| `TypeEvaluation`, `Evaluation` | TP / Interrogations / Examens, sur `/maximum` (20) |
| `Note` | Note d'un élève à une évaluation (unique `inscription × évaluation`), verrou : `estValide`, `valideParId`, `dateValidation` |
| `Bulletin` | Résultat par type : total obtenu/maximum, pourcentage, **rang**, décision |

---

## 🧮 Règles de calcul des notes

Implémentées dans `notes.service.ts`.

- **Note de période (sur 20)** — moyenne pondérée des évaluations **validées** de la période :

  $$\text{NotePériode} = \frac{\sum \big(\tfrac{\text{Note}}{\text{Maximum}} \times 20 \times \text{Pondération}_i\big)}{\sum \text{Pondération}_i}$$

  où `Pondération` est celle du `TypeEvaluation` (ex. interrogation 0.6, TP 0.4).

- **Note de semestre (sur 20)** — moyenne des périodes **réellement évaluées** (une période vide n'abaisse pas la moyenne) ; les **examens** (`idPeriode = null`) comptent **double** :

  $$\text{NoteSemestre} = \frac{\sum \text{Périodes} + 2 \times \sum \text{Examens}}{\text{NbPériodes} + 2 \times \text{NbExamens}}$$

- **Bulletin** — application du coefficient de la matière (`ClasseMatiere`) :

  $$\text{NoteBulletin} = \text{NoteSemestre} \times \text{Coefficient}$$

  $$\text{Pourcentage} = \frac{\sum \text{NoteBulletin}}{\sum (\text{Coefficient} \times 20)} \times 100$$

  Le **rang** est attribué par pourcentage décroissant ; décision `Réussi` si pourcentage ≥ 50 %.

---

## 🔐 Authentification & autorisations

- **JWT Bearer** : chaque requête (hors `login` et `health`) doit porter `Authorization: Bearer <token>`.
- **`@UseGuards(JwtAuthGuard, RolesGuard)`** + **`@Roles(...)`** contrôlent l'accès par rôle.
- Un enseignant ne peut agir **que sur ses propres affectations** (vérification d'appartenance dans le service).

| Rôle | Signification |
|---|---|
| `ADMIN` | Accès total (administration, validation des notes, bulletins) |
| `TEACHER` | Saisie des notes de ses affectations |
| `STUDENT` | Consultation de ses notes et bulletins |

---

## 📡 Endpoints de l'API

### Authentification — `/auth` *(public : login)*

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| `POST` | `/auth/login` | public | Connexion (`nomUtilisateur`, `motDePasse`) → `{ accessToken, user }` |
| `GET` | `/auth/me` | authentifié | Profil de l'utilisateur courant |

### Administration — `/administration`

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| `GET` | `/catalogue` | authentifié | Sections/options/classes, matières, enseignants actifs, années |
| `GET` | `/students` | `ADMIN` | Liste des élèves + inscriptions |
| `GET` | `/assignments` | `ADMIN` | Liste des affectations |
| `GET` | `/class-subjects` | `ADMIN` | Couples classe–matière avec coefficients |
| `GET` | `/my-assignments` | `TEACHER` | Affectations de l'enseignant connecté |
| `POST` | `/teachers` | `ADMIN` | Créer un enseignant |
| `POST` | `/students` | `ADMIN` | Créer un élève |
| `POST` | `/sections` | `ADMIN` | Créer une section |
| `POST` | `/options` | `ADMIN` | Créer une option |
| `POST` | `/classes` | `ADMIN` | Créer une classe |
| `POST` | `/subjects` | `ADMIN` | Créer une matière |
| `POST` | `/academic-years` | `ADMIN` | Créer une année scolaire (activation exclusive) |
| `POST` | `/class-subjects` | `ADMIN` | Définir le coefficient d'un couple classe–matière |
| `POST` | `/assignments` | `ADMIN` | Affecter un enseignant |
| `POST` | `/enrolments` | `ADMIN` | Inscrire un élève pour une année |

### Notes — `/notes`

| Méthode | Route | Rôles | Description |
|---|---|---|---|
| `GET` | `/context` | `TEACHER` | Contexte de saisie (affectations, semestres/périodes, types, évaluations) |
| `POST` | `/evaluations` | `TEACHER` | Créer une évaluation |
| `POST` | `/batch` | `TEACHER` | Enregistrer la grille de notes (brouillon, upsert ; cellule vide = suppression) |
| `POST` | `/evaluations/:id/soumettre` | `TEACHER` | Soumettre l'évaluation (→ `SOUMISE`) |
| `GET` | `/grille/:id` | `TEACHER`, `ADMIN` | Grille d'évaluation (élèves + notes) |
| `GET` | `/validations` | `ADMIN` | Évaluations en attente (`SOUMISE`) |
| `POST` | `/validations/:id/valider` | `ADMIN` | Valider et verrouiller (→ `VALIDEE`, `estValide`) |
| `POST` | `/bulletins/semestre/:id/calculer` | `ADMIN` | Recalculer les bulletins du semestre + classement |
| `GET` | `/bulletins/inscription/:id` | `ADMIN` | Bulletins d'un élève |
| `GET` | `/reports/semestres` | `ADMIN` | Semestres disponibles |
| `GET` | `/reports/semestre/:id` | `ADMIN` | Classement de la cohorte |
| `GET` | `/reports/inscription/:inscriptionId/semestre/:semestreId` | `ADMIN` | Bulletin détaillé (matières, notes × coefficients) |

---

## ⚙️ Variables d'environnement

Copiez `.env.example` → `.env` (déjà fait en développement).

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | Chaîne de connexion Prisma | `postgresql://kotaschool:kotaschool@localhost:5433/kotaschool?schema=public` |
| `JWT_SECRET` | Secret de signature JWT | à changer hors développement |
| `JWT_EXPIRES_IN` | Durée de validité | `8h` |
| `PORT` | Port HTTP de l'API | `4000` |

> `compose.yml` fournit des valeurs de développement ; **ne pas les utiliser en production**.

---

## 🐘 PostgreSQL et ports (⚠️ important)

Sur cette machine, un **PostgreSQL local (service Windows `postgresql-x64-18`) occupe déjà le port 5432**.

- Le conteneur Docker `postgres` est donc publié sur le port hôte **`5433`** (`5433:5432`).
- Depuis l'hôte, `DATABASE_URL` pointe vers **`localhost:5433`**.
- À l'intérieur du réseau Docker, l'API utilise `postgres:5432` (inchangé, défini dans `compose.yml`).

Pour vérifier : `docker ps` — le conteneur `kotaschool-backend-postgres-1` doit écouter sur `0.0.0.0:5433`.

---

## 🚀 Installation & démarrage

### Prérequis

- Docker Desktop (recommandé) **ou** Node.js ≥ 20 + PostgreSQL 16
- npm

### Avec Docker (recommandé)

```bash
cd kotaschool-backend
docker compose up -d --build      # démarre postgres (5433) + api (4000, mode watch)
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

> Le service `api` monte le code source et recompile en watch. Sous Windows, si une modification n'est pas détectée, redémarrez le conteneur : `docker compose restart api`.

### Sans Docker

```bash
cd kotaschool-backend
npm install
npx prisma generate
npx prisma migrate deploy        # base PostgreSQL accessible via DATABASE_URL
npm run prisma:seed
npm run start:dev                # http://localhost:4000/api/v1
```

---

## 🗃️ Migrations & seed

```bash
# Appliquer les migrations existantes (non interactif)
npx prisma migrate deploy

# Créer/appliquer une nouvelle migration après modification de schema.prisma
npm run prisma:migrate           # = prisma migrate dev

# Générer le client
npm run prisma:generate

# Peupler la base (rôles, comptes, structure, affectations, élèves)
npm run prisma:seed              # charge .env via --env-file
```

Le seed crée : les 4 rôles, `admin` (ADMIN) et `prof` (TEACHER lié à l'enseignant « Test »), les types d'évaluation, l'année **2026–2027** (active) avec le **Semestre 1 (P1–P4)**, la classe « 6e Math-Physique », 4 matières avec coefficients, l'affectation du prof sur les Mathématiques et 3 élèves inscrits.

---

## 🔑 Comptes de démonstration

| Utilisateur | Rôle | Mot de passe |
|---|---|---|
| `admin` | Administrateur | `ChangeMe123!` |
| `prof` | Enseignant | `ChangeMe123!` |

> Modifiez ces mots de passe et `JWT_SECRET` hors développement.

---

## 📜 Scripts npm

| Script | Description |
|---|---|
| `build` | Compilation NestJS (`nest build`) |
| `start` / `start:dev` / `start:prod` | Démarrage (watch / prod) |
| `prisma:generate` | Génération du client Prisma |
| `prisma:migrate` | `prisma migrate dev` |
| `prisma:seed` | Peuplement de la base |
| `lint` | ESLint |
| `node scripts/test-notes.mjs` | Test de bout en bout du module notes (API lancée) |
| `node scripts/test-reports.mjs` | Test de bout en bout des bulletins (API lancée) |

---

## 🧪 Tester l'API

Avec l'API démarrée (`http://localhost:4000`) :

```bash
node scripts/test-notes.mjs     # login → évaluation → saisie → soumission → validation → bulletins
node scripts/test-reports.mjs   # semestres → classement → bulletin détaillé
```

Exemple de flux manuel :

```bash
# 1. Connexion
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"nomUtilisateur":"prof","motDePasse":"ChangeMe123!"}'

# 2. Contexte enseignant (avec le token ci-dessus)
curl http://localhost:4000/api/v1/notes/context -H "Authorization: Bearer <token>"
```

---

## 🛠️ Dépannage

| Symptôme | Cause / solution |
|---|---|
| `Environment variable not found: DATABASE_URL` | Lancer le seed/migrate depuis `kotaschool-backend` avec le `.env` présent (`npm run prisma:seed` charge `.env`) |
| Échec de connexion base depuis l'hôte | Vérifier `localhost:5433` (le 5432 est le PostgreSQL local) |
| `EADDRINUSE :4000` | Un conteneur `api` tourne déjà ; redémarrer plutôt que relancer |
| Endpoint introuvable (404) après ajout de code | Redémarrer le conteneur `api` (`docker compose restart api`) |
| Violation d'unicité | L'API renvoie `409` avec un message explicite (filtre `PrismaExceptionFilter`) |

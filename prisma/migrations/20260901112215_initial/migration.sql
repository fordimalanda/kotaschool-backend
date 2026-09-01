-- CreateEnum
CREATE TYPE "CodeRole" AS ENUM ('ADMIN', 'TEACHER', 'SECRETARY', 'PEDAGOGICAL_COUNCIL');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "StatutEvaluation" AS ENUM ('BROUILLON', 'SOUMISE', 'VALIDEE');

-- CreateEnum
CREATE TYPE "TypeBulletin" AS ENUM ('PERIODE', 'SEMESTRE', 'ANNUEL');

-- CreateTable
CREATE TABLE "roles" (
    "idRole" TEXT NOT NULL,
    "code" "CodeRole" NOT NULL,
    "libelleRole" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("idRole")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "idUtilisateur" TEXT NOT NULL,
    "nomUtilisateur" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),
    "idRole" TEXT NOT NULL,
    "enseignantId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("idUtilisateur")
);

-- CreateTable
CREATE TABLE "sections" (
    "idSection" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("idSection")
);

-- CreateTable
CREATE TABLE "options" (
    "idOption" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "idSection" TEXT NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("idOption")
);

-- CreateTable
CREATE TABLE "classes" (
    "idClasse" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "idOption" TEXT NOT NULL,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),

    CONSTRAINT "classes_pkey" PRIMARY KEY ("idClasse")
);

-- CreateTable
CREATE TABLE "eleves" (
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "postnom" TEXT,
    "prenom" TEXT NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "lieuNaissance" TEXT,
    "adresse" TEXT,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),

    CONSTRAINT "eleves_pkey" PRIMARY KEY ("matricule")
);

-- CreateTable
CREATE TABLE "enseignants" (
    "idEnseignant" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "postnom" TEXT,
    "prenom" TEXT NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "estActif" BOOLEAN NOT NULL DEFAULT true,
    "supprimeLe" TIMESTAMP(3),

    CONSTRAINT "enseignants_pkey" PRIMARY KEY ("idEnseignant")
);

-- CreateTable
CREATE TABLE "matieres" (
    "idMatiere" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("idMatiere")
);

-- CreateTable
CREATE TABLE "classe_matieres" (
    "idClasseMatiere" TEXT NOT NULL,
    "idClasse" TEXT NOT NULL,
    "idMatiere" TEXT NOT NULL,
    "coefficient" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "classe_matieres_pkey" PRIMARY KEY ("idClasseMatiere")
);

-- CreateTable
CREATE TABLE "annees_scolaires" (
    "idAnnee" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "estActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "annees_scolaires_pkey" PRIMARY KEY ("idAnnee")
);

-- CreateTable
CREATE TABLE "semestres" (
    "idSemestre" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "idAnnee" TEXT NOT NULL,

    CONSTRAINT "semestres_pkey" PRIMARY KEY ("idSemestre")
);

-- CreateTable
CREATE TABLE "periodes" (
    "idPeriode" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "idSemestre" TEXT NOT NULL,

    CONSTRAINT "periodes_pkey" PRIMARY KEY ("idPeriode")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "idInscription" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "idClasse" TEXT NOT NULL,
    "idAnnee" TEXT NOT NULL,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("idInscription")
);

-- CreateTable
CREATE TABLE "affectations" (
    "idAffectation" TEXT NOT NULL,
    "idEnseignant" TEXT NOT NULL,
    "idClasseMatiere" TEXT NOT NULL,
    "idAnnee" TEXT NOT NULL,

    CONSTRAINT "affectations_pkey" PRIMARY KEY ("idAffectation")
);

-- CreateTable
CREATE TABLE "types_evaluation" (
    "idTypeEvaluation" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "types_evaluation_pkey" PRIMARY KEY ("idTypeEvaluation")
);

-- CreateTable
CREATE TABLE "evaluations" (
    "idEvaluation" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "idAffectation" TEXT NOT NULL,
    "idPeriode" TEXT,
    "idSemestre" TEXT NOT NULL,
    "idTypeEvaluation" TEXT NOT NULL,
    "maximum" DECIMAL(8,2) NOT NULL,
    "ponderation" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "dateEvaluation" TIMESTAMP(3) NOT NULL,
    "statut" "StatutEvaluation" NOT NULL DEFAULT 'BROUILLON',

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("idEvaluation")
);

-- CreateTable
CREATE TABLE "notes" (
    "idNote" TEXT NOT NULL,
    "valeurNote" DECIMAL(8,2) NOT NULL,
    "observation" TEXT,
    "estValide" BOOLEAN NOT NULL DEFAULT false,
    "valideParId" TEXT,
    "dateValidation" TIMESTAMP(3),
    "idInscription" TEXT NOT NULL,
    "idEvaluation" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("idNote")
);

-- CreateTable
CREATE TABLE "bulletins" (
    "idBulletin" TEXT NOT NULL,
    "type" "TypeBulletin" NOT NULL,
    "totalObtenu" DECIMAL(10,2) NOT NULL,
    "totalMaximum" DECIMAL(10,2) NOT NULL,
    "pourcentage" DECIMAL(6,2) NOT NULL,
    "rang" INTEGER,
    "decision" TEXT,
    "idInscription" TEXT NOT NULL,
    "idSemestre" TEXT,
    "idAnnee" TEXT NOT NULL,

    CONSTRAINT "bulletins_pkey" PRIMARY KEY ("idBulletin")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_nomUtilisateur_key" ON "utilisateurs"("nomUtilisateur");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_enseignantId_key" ON "utilisateurs"("enseignantId");

-- CreateIndex
CREATE INDEX "utilisateurs_idRole_idx" ON "utilisateurs"("idRole");

-- CreateIndex
CREATE UNIQUE INDEX "sections_libelle_key" ON "sections"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "options_libelle_idSection_key" ON "options"("libelle", "idSection");

-- CreateIndex
CREATE UNIQUE INDEX "classes_libelle_idOption_key" ON "classes"("libelle", "idOption");

-- CreateIndex
CREATE UNIQUE INDEX "enseignants_email_key" ON "enseignants"("email");

-- CreateIndex
CREATE UNIQUE INDEX "matieres_libelle_key" ON "matieres"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "classe_matieres_idClasse_idMatiere_key" ON "classe_matieres"("idClasse", "idMatiere");

-- CreateIndex
CREATE UNIQUE INDEX "annees_scolaires_libelle_key" ON "annees_scolaires"("libelle");

-- CreateIndex
CREATE UNIQUE INDEX "semestres_libelle_idAnnee_key" ON "semestres"("libelle", "idAnnee");

-- CreateIndex
CREATE UNIQUE INDEX "periodes_libelle_idSemestre_key" ON "periodes"("libelle", "idSemestre");

-- CreateIndex
CREATE INDEX "inscriptions_idClasse_idAnnee_idx" ON "inscriptions"("idClasse", "idAnnee");

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_matricule_idAnnee_key" ON "inscriptions"("matricule", "idAnnee");

-- CreateIndex
CREATE UNIQUE INDEX "affectations_idEnseignant_idClasseMatiere_idAnnee_key" ON "affectations"("idEnseignant", "idClasseMatiere", "idAnnee");

-- CreateIndex
CREATE UNIQUE INDEX "types_evaluation_libelle_key" ON "types_evaluation"("libelle");

-- CreateIndex
CREATE INDEX "evaluations_idAffectation_idPeriode_idx" ON "evaluations"("idAffectation", "idPeriode");

-- CreateIndex
CREATE UNIQUE INDEX "notes_idInscription_idEvaluation_key" ON "notes"("idInscription", "idEvaluation");

-- CreateIndex
CREATE INDEX "bulletins_idInscription_idAnnee_type_idx" ON "bulletins"("idInscription", "idAnnee", "type");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_idRole_fkey" FOREIGN KEY ("idRole") REFERENCES "roles"("idRole") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "enseignants"("idEnseignant") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_idSection_fkey" FOREIGN KEY ("idSection") REFERENCES "sections"("idSection") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_idOption_fkey" FOREIGN KEY ("idOption") REFERENCES "options"("idOption") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classe_matieres" ADD CONSTRAINT "classe_matieres_idClasse_fkey" FOREIGN KEY ("idClasse") REFERENCES "classes"("idClasse") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classe_matieres" ADD CONSTRAINT "classe_matieres_idMatiere_fkey" FOREIGN KEY ("idMatiere") REFERENCES "matieres"("idMatiere") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semestres" ADD CONSTRAINT "semestres_idAnnee_fkey" FOREIGN KEY ("idAnnee") REFERENCES "annees_scolaires"("idAnnee") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "periodes" ADD CONSTRAINT "periodes_idSemestre_fkey" FOREIGN KEY ("idSemestre") REFERENCES "semestres"("idSemestre") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_matricule_fkey" FOREIGN KEY ("matricule") REFERENCES "eleves"("matricule") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_idClasse_fkey" FOREIGN KEY ("idClasse") REFERENCES "classes"("idClasse") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_idAnnee_fkey" FOREIGN KEY ("idAnnee") REFERENCES "annees_scolaires"("idAnnee") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_idEnseignant_fkey" FOREIGN KEY ("idEnseignant") REFERENCES "enseignants"("idEnseignant") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_idClasseMatiere_fkey" FOREIGN KEY ("idClasseMatiere") REFERENCES "classe_matieres"("idClasseMatiere") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_idAnnee_fkey" FOREIGN KEY ("idAnnee") REFERENCES "annees_scolaires"("idAnnee") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_idAffectation_fkey" FOREIGN KEY ("idAffectation") REFERENCES "affectations"("idAffectation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_idPeriode_fkey" FOREIGN KEY ("idPeriode") REFERENCES "periodes"("idPeriode") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_idSemestre_fkey" FOREIGN KEY ("idSemestre") REFERENCES "semestres"("idSemestre") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_idTypeEvaluation_fkey" FOREIGN KEY ("idTypeEvaluation") REFERENCES "types_evaluation"("idTypeEvaluation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_idInscription_fkey" FOREIGN KEY ("idInscription") REFERENCES "inscriptions"("idInscription") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_idEvaluation_fkey" FOREIGN KEY ("idEvaluation") REFERENCES "evaluations"("idEvaluation") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "utilisateurs"("idUtilisateur") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_idInscription_fkey" FOREIGN KEY ("idInscription") REFERENCES "inscriptions"("idInscription") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulletins" ADD CONSTRAINT "bulletins_idSemestre_fkey" FOREIGN KEY ("idSemestre") REFERENCES "semestres"("idSemestre") ON DELETE SET NULL ON UPDATE CASCADE;

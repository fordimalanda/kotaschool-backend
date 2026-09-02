-- Ajout du rôle ÉLÈVE à l'énumération CodeRole
ALTER TYPE "CodeRole" ADD VALUE IF NOT EXISTS 'STUDENT';

-- AlterTable : colonnes email et eleveId sur utilisateurs
ALTER TABLE "utilisateurs" ADD COLUMN "email" TEXT,
ADD COLUMN "eleveId" TEXT;

-- Contraintes d'unicité
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_email_key" UNIQUE ("email");
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_eleveId_key" UNIQUE ("eleveId");

-- Relation one-to-one utilisateur ↔ élève (matricule)
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_eleveId_fkey" FOREIGN KEY ("eleveId") REFERENCES "eleves"("matricule") ON DELETE SET NULL ON UPDATE CASCADE;

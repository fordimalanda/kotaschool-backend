-- Réduction des rôles système : suppression de SECRETARY et PEDAGOGICAL_COUNCIL.
-- Seuls ADMIN, TEACHER et STUDENT sont conservés.

-- 1. Suppression des utilisateurs rattachés aux rôles supprimés (si présents)
DELETE FROM "utilisateurs" WHERE "idRole" IN (SELECT "idRole" FROM "roles" WHERE "code" IN ('SECRETARY', 'PEDAGOGICAL_COUNCIL'));

-- 2. Suppression des rôles obsolètes
DELETE FROM "roles" WHERE "code" IN ('SECRETARY', 'PEDAGOGICAL_COUNCIL');

-- 3. Retrait des valeurs SECRETARY et PEDAGOGICAL_COUNCIL de l'enum CodeRole
ALTER TYPE "CodeRole" RENAME TO "CodeRole_old";
CREATE TYPE "CodeRole" AS ENUM ('ADMIN', 'TEACHER', 'STUDENT');
ALTER TABLE "roles" ALTER COLUMN "code" TYPE "CodeRole" USING ("code"::text::"CodeRole");
DROP TYPE "CodeRole_old";

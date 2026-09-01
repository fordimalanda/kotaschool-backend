-- AlterTable
ALTER TABLE "evaluations" ALTER COLUMN "maximum" SET DEFAULT 20;

-- AlterTable
ALTER TABLE "types_evaluation" ADD COLUMN     "ponderation" DECIMAL(5,2) NOT NULL DEFAULT 1;

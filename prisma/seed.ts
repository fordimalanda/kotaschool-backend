import { PrismaClient, CodeRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();
async function main() {
  for (const code of Object.values(CodeRole)) await prisma.role.upsert({ where: { code }, update: {}, create: { code, libelle: { ADMIN: 'Administrateur', TEACHER: 'Enseignant', SECRETARY: 'Administration', PEDAGOGICAL_COUNCIL: 'Conseil pédagogique' }[code] } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: CodeRole.ADMIN } });
  await prisma.utilisateur.upsert({ where: { nomUtilisateur: 'admin' }, update: {}, create: { nomUtilisateur: 'admin', motDePasse: await bcrypt.hash('ChangeMe123!', 12), idRole: adminRole.id } });
}
main().finally(() => prisma.$disconnect());

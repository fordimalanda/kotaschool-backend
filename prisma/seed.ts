import { PrismaClient, CodeRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  for (const code of Object.values(CodeRole)) {
    await prisma.role.upsert({
      where: { code },
      update: {},
      create: {
        code,
        libelle: {
          ADMIN: 'Administrateur',
          TEACHER: 'Enseignant',
          SECRETARY: 'Administration',
          PEDAGOGICAL_COUNCIL: 'Conseil pédagogique',
          STUDENT: 'Élève',
        }[code],
      },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: CodeRole.ADMIN } });
  const adminEmail = 'admin@kotaschool.local';
  const adminPassword = 'admin';

  await prisma.utilisateur.upsert({
    where: { email: adminEmail },
    update: {
      nomUtilisateur: adminEmail,
      motDePasse: await bcrypt.hash(adminPassword, 12),
      estActif: true,
      idRole: adminRole.id,
    },
    create: {
      nomUtilisateur: adminEmail,
      email: adminEmail,
      motDePasse: await bcrypt.hash(adminPassword, 12),
      idRole: adminRole.id,
      estActif: true,
    },
  });

  console.log('Seed minimal terminé : seules les données de base et le compte admin sont conservées.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());

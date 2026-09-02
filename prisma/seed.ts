import { PrismaClient, CodeRole, Sexe } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

const ENSEIGNANT_TEST_ID = '00000000-0000-0000-0000-000000000001';

async function seedRolesAndUsers() {
  for (const code of Object.values(CodeRole)) await prisma.role.upsert({ where: { code }, update: {}, create: { code, libelle: { ADMIN: 'Administrateur', TEACHER: 'Enseignant', SECRETARY: 'Administration', PEDAGOGICAL_COUNCIL: 'Conseil pédagogique', STUDENT: 'Élève' }[code] } });
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: CodeRole.ADMIN } });
  const teacherRole = await prisma.role.findUniqueOrThrow({ where: { code: CodeRole.TEACHER } });
  await prisma.utilisateur.upsert({ where: { nomUtilisateur: 'admin' }, update: { email: 'admin@kotaschool.local', motDePasse: await bcrypt.hash('admin', 12) }, create: { nomUtilisateur: 'admin', email: 'admin@kotaschool.local', motDePasse: await bcrypt.hash('admin', 12), idRole: adminRole.id } });
  // Compte enseignant de test : indispensable pour accéder à la « Saisie des notes » (rôle TEACHER).
  const enseignant = await prisma.enseignant.upsert({ where: { id: ENSEIGNANT_TEST_ID }, update: {}, create: { id: ENSEIGNANT_TEST_ID, nom: 'Enseignant', prenom: 'Test', sexe: Sexe.M } });
  await prisma.utilisateur.upsert({ where: { nomUtilisateur: 'prof' }, update: { email: 'prof@kotaschool.local', motDePasse: await bcrypt.hash('prof', 12) }, create: { nomUtilisateur: 'prof', email: 'prof@kotaschool.local', motDePasse: await bcrypt.hash('prof', 12), idRole: teacherRole.id, enseignantId: enseignant.id } });
  return { enseignant };
}

async function seedStructure(enseignantId: string) {
  // Types d'évaluation
  for (const type of [{ libelle: 'INTERROGATION', ponderation: 0.6 }, { libelle: 'TP', ponderation: 0.4 }, { libelle: 'EXAMEN', ponderation: 2 }]) await prisma.typeEvaluation.upsert({ where: { libelle: type.libelle }, update: { ponderation: type.ponderation }, create: type });

  // Année scolaire active
  const annee = await prisma.anneeScolaire.upsert({ where: { libelle: '2026–2027' }, update: { estActive: true }, create: { libelle: '2026–2027', estActive: true } });
  await prisma.anneeScolaire.updateMany({ where: { NOT: { id: annee.id } }, data: { estActive: false } });

  // Semestre 1 + périodes P1..P4
  const semestre = await prisma.semestre.upsert({ where: { libelle_idAnnee: { libelle: 'Semestre 1', idAnnee: annee.id } }, update: {}, create: { libelle: 'Semestre 1', idAnnee: annee.id } });
  for (const p of ['P1', 'P2', 'P3', 'P4']) await prisma.periode.upsert({ where: { libelle_idSemestre: { libelle: p, idSemestre: semestre.id } }, update: {}, create: { libelle: p, idSemestre: semestre.id } });

  // Structure pédagogique : Section > Option > Classe
  const section = await prisma.section.upsert({ where: { libelle: 'Scientifique' }, update: {}, create: { libelle: 'Scientifique' } });
  const option = await prisma.option.upsert({ where: { libelle_idSection: { libelle: 'Math-Physique', idSection: section.id } }, update: {}, create: { libelle: 'Math-Physique', idSection: section.id } });
  const classe = await prisma.classe.upsert({ where: { libelle_idOption: { libelle: '6e Math-Physique', idOption: option.id } }, update: {}, create: { libelle: '6e Math-Physique', niveau: '6e', idOption: option.id } });

  // Matières + coefficients par classe
  const subjects = [
    { libelle: 'Mathématiques', coefficient: 4 },
    { libelle: 'Physique', coefficient: 3 },
    { libelle: 'Français', coefficient: 3 },
    { libelle: 'Histoire', coefficient: 1 },
  ];
  const classeMatieres: { id: string; libelle: string }[] = [];
  for (const s of subjects) {
    const matiere = await prisma.matiere.upsert({ where: { libelle: s.libelle }, update: {}, create: { libelle: s.libelle } });
    const cm = await prisma.classeMatiere.upsert({ where: { idClasse_idMatiere: { idClasse: classe.id, idMatiere: matiere.id } }, update: { coefficient: s.coefficient }, create: { idClasse: classe.id, idMatiere: matiere.id, coefficient: s.coefficient } });
    classeMatieres.push({ id: cm.id, libelle: matiere.libelle });
  }

  // Affectation : le prof test enseigne les Mathématiques dans la classe
  const mathCm = classeMatieres.find((c) => c.libelle === 'Mathématiques');
  if (mathCm) await prisma.affectation.upsert({ where: { idEnseignant_idClasseMatiere_idAnnee: { idEnseignant: enseignantId, idClasseMatiere: mathCm.id, idAnnee: annee.id } }, update: {}, create: { idEnseignant: enseignantId, idClasseMatiere: mathCm.id, idAnnee: annee.id } });

  // Élèves + inscriptions
  const eleves = [
    { matricule: 'KOT-2026-001', nom: 'Banza', postnom: 'Kalume', prenom: 'Aline', sexe: Sexe.F as Sexe },
    { matricule: 'KOT-2026-002', nom: 'Ilunga', postnom: 'Mbuyi', prenom: 'David', sexe: Sexe.M as Sexe },
    { matricule: 'KOT-2026-003', nom: 'Kabila', postnom: 'Lumumba', prenom: 'Grâce', sexe: Sexe.F as Sexe },
  ];
  for (const e of eleves) {
    await prisma.eleve.upsert({ where: { matricule: e.matricule }, update: {}, create: { matricule: e.matricule, nom: e.nom, postnom: e.postnom, prenom: e.prenom, sexe: e.sexe, dateNaissance: new Date('2008-09-01') } });
    await prisma.inscription.upsert({ where: { matricule_idAnnee: { matricule: e.matricule, idAnnee: annee.id } }, update: { idClasse: classe.id }, create: { matricule: e.matricule, idClasse: classe.id, idAnnee: annee.id } });
  }

  // Compte élève de démonstration (rôle STUDENT) : se connecte avec son e-mail, mot de passe par défaut 'student'.
  const studentRole = await prisma.role.findUniqueOrThrow({ where: { code: CodeRole.STUDENT } });
  await prisma.utilisateur.upsert({ where: { email: 'aline.banza@kotaschool.local' }, update: {}, create: { nomUtilisateur: 'aline.banza@kotaschool.local', email: 'aline.banza@kotaschool.local', motDePasse: await bcrypt.hash('student', 12), idRole: studentRole.id, eleveId: 'KOT-2026-001' } });

  return { annee, semestre, classe };
}

async function main() {
  const { enseignant } = await seedRolesAndUsers();
  await seedStructure(enseignant.id);
  console.log('Seed terminé : rôles, utilisateurs (admin / prof), structure pédagogique et affectations créés.');
}

main().finally(() => prisma.$disconnect());

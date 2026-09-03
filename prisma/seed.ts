import { PrismaClient, CodeRole, Sexe, StatutEvaluation, TypeBulletin, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function sanitize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('====================================================');
  console.log('🚀 Démarrage du Seeding MASSIF de Kotaschool...');
  console.log('====================================================');

  // ----------------------------------------------------
  // 1. NETTOYAGE COMPLET DE LA BASE DE DONNÉES (TRUNCATE)
  // ----------------------------------------------------
  console.log('🧹 1. Réinitialisation complète de toutes les tables...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "bulletins", 
      "notes", 
      "evaluations", 
      "types_evaluation", 
      "affectations", 
      "inscriptions", 
      "classe_matieres", 
      "matieres", 
      "classes", 
      "options", 
      "sections", 
      "periodes", 
      "semestres", 
      "annees_scolaires", 
      "utilisateurs", 
      "eleves", 
      "enseignants", 
      "roles" 
    RESTART IDENTITY CASCADE;
  `);

  // ----------------------------------------------------
  // 2. CRÉATION DES RÔLES
  // ----------------------------------------------------
  console.log('🔑 2. Création des rôles système...');
  const roleLibelles: Record<CodeRole, string> = {
    ADMIN: 'Administrateur',
    TEACHER: 'Enseignant',
    SECRETARY: 'Secrétaire / Administration',
    PEDAGOGICAL_COUNCIL: 'Conseil pédagogique',
    STUDENT: 'Élève',
  };

  const rolesMap = new Map<CodeRole, string>();
  for (const code of Object.values(CodeRole)) {
    const role = await prisma.role.create({
      data: {
        code,
        libelle: roleLibelles[code],
      },
    });
    rolesMap.set(code, role.id);
  }

  // Hasher les mots de passe une seule fois pour une performance optimale
  console.log('🔐 Pré-génération des hashs de mots de passe...');
  const adminPasswordHash = await bcrypt.hash('MALANDA100', 10);
  const profPasswordHash = await bcrypt.hash('prof', 10);
  const studentPasswordHash = await bcrypt.hash('student', 10);

  // ----------------------------------------------------
  // 3. COMPTE ADMINISTRATEUR PAR DÉFAUT
  // ----------------------------------------------------
  console.log('👤 3. Création du compte administrateur...');
  const adminEmail = 'fordimalanda7@gmail.com';
  const adminUser = await prisma.utilisateur.create({
    data: {
      nomUtilisateur: adminEmail,
      email: adminEmail,
      motDePasse: adminPasswordHash,
      idRole: rolesMap.get(CodeRole.ADMIN)!,
      estActif: true,
    },
  });
  console.log(`   ✔️ Admin créé: ${adminEmail} (Role: ADMIN / Mdp: MALANDA100)`);

  // ----------------------------------------------------
  // 4. ANNÉE SCOLAIRE, SEMESTRES ET PÉRIODES (2026–2027)
  // ----------------------------------------------------
  console.log('📅 4. Création de l’année scolaire 2026–2027, semestres et périodes...');
  const annee = await prisma.anneeScolaire.create({
    data: {
      libelle: '2026–2027',
      estActive: true,
    },
  });

  const semestre1 = await prisma.semestre.create({
    data: {
      libelle: 'Semestre 1 (2026–2027)',
      idAnnee: annee.id,
    },
  });

  const semestre2 = await prisma.semestre.create({
    data: {
      libelle: 'Semestre 2 (2026–2027)',
      idAnnee: annee.id,
    },
  });

  const p1 = await prisma.periode.create({
    data: {
      libelle: 'Première Période - P1',
      idSemestre: semestre1.id,
    },
  });

  const p2 = await prisma.periode.create({
    data: {
      libelle: 'Deuxième Période - P2',
      idSemestre: semestre1.id,
    },
  });

  const p3 = await prisma.periode.create({
    data: {
      libelle: 'Troisième Période - P3',
      idSemestre: semestre2.id,
    },
  });

  const p4 = await prisma.periode.create({
    data: {
      libelle: 'Quatrième Période - P4',
      idSemestre: semestre2.id,
    },
  });

  // ----------------------------------------------------
  // 5. STRUCTURE ACADÉMIQUE (Sections, Options, 12 Classes)
  // ----------------------------------------------------
  console.log('🏫 5. Création des sections, options et classes...');

  const secScientifique = await prisma.section.create({
    data: { libelle: 'Scientifique' },
  });

  // Tronc commun Scientifique (1ère & 2ème) : pas encore de spécialisation
  const optScientifique = await prisma.option.create({
    data: { libelle: 'Scientifique', idSection: secScientifique.id },
  });

  // Filières spécialisées (3ème & 4ème)
  const optMathPhysique = await prisma.option.create({
    data: { libelle: 'Mathématiques–Physique', idSection: secScientifique.id },
  });

  const optChimieBio = await prisma.option.create({
    data: { libelle: 'Chimie-Biologie', idSection: secScientifique.id },
  });

  const secCommerciale = await prisma.section.create({
    data: { libelle: 'Commerciale et Gestion' },
  });

  const optCommerciale = await prisma.option.create({
    data: { libelle: 'Commerciale et Gestion', idSection: secCommerciale.id },
  });

  const classesMap = new Map<string, any>();

  // Tronc commun : 1ère et 2ème Scientifique (option générale Scientifique)
  const classesScientifique = [
    { libelle: '1ère Scientifique', niveau: '1ère' },
    { libelle: '2ème Scientifique', niveau: '2ème' },
  ];
  for (const c of classesScientifique) {
    const cl = await prisma.classe.create({
      data: { libelle: c.libelle, niveau: c.niveau, idOption: optScientifique.id },
    });
    classesMap.set(c.libelle, cl);
  }

  // Spécialisation Mathématiques–Physique : 3ème et 4ème seulement
  const classesMathPhys = [
    { libelle: '3ème Math-Physique', niveau: '3ème' },
    { libelle: '4ème Math-Physique', niveau: '4ème' },
  ];
  for (const c of classesMathPhys) {
    const cl = await prisma.classe.create({
      data: { libelle: c.libelle, niveau: c.niveau, idOption: optMathPhysique.id },
    });
    classesMap.set(c.libelle, cl);
  }

  // Spécialisation Chimie-Biologie : 3ème et 4ème seulement
  const classesChimieBio = [
    { libelle: '3ème Chimie-Biologie', niveau: '3ème' },
    { libelle: '4ème Chimie-Biologie', niveau: '4ème' },
  ];
  for (const c of classesChimieBio) {
    const cl = await prisma.classe.create({
      data: { libelle: c.libelle, niveau: c.niveau, idOption: optChimieBio.id },
    });
    classesMap.set(c.libelle, cl);
  }

  const classesComm = [
    { libelle: '1ère Commerciale', niveau: '1ère' },
    { libelle: '2ème Commerciale', niveau: '2ème' },
    { libelle: '3ème Commerciale', niveau: '3ème' },
    { libelle: '4ème Commerciale', niveau: '4ème' },
  ];
  for (const c of classesComm) {
    const cl = await prisma.classe.create({
      data: { libelle: c.libelle, niveau: c.niveau, idOption: optCommerciale.id },
    });
    classesMap.set(c.libelle, cl);
  }

  // ----------------------------------------------------
  // 6. MATIÈRES ET COEFFICIENTS (ClasseMatiere)
  // ----------------------------------------------------
  console.log('📚 6. Configuration des matières et coefficients...');

  const matieresScientifiques = [
    { libelle: 'Mathématiques', coef: 4 },
    { libelle: 'Physique', coef: 3 },
    { libelle: 'Chimie', coef: 3 },
    { libelle: 'Biologie', coef: 2 },
    { libelle: 'Français', coef: 3 },
    { libelle: 'Anglais', coef: 2 },
    { libelle: 'Informatique / TIC', coef: 2 },
    { libelle: 'Histoire', coef: 1 },
    { libelle: 'Géographie', coef: 1 },
    { libelle: 'Philosophie / EDHC', coef: 1 },
    { libelle: 'Éducation Physique', coef: 1 },
  ];

  const matieresCommerciales = [
    { libelle: 'Comptabilité', coef: 4 },
    { libelle: 'Mathématiques Financières', coef: 3 },
    { libelle: 'Économie Générale', coef: 3 },
    { libelle: 'Commercial & Correspondance', coef: 3 },
    { libelle: 'Informatique de Gestion', coef: 2 },
    { libelle: 'Droit & Législation', coef: 2 },
    { libelle: 'Statistique', coef: 2 },
    { libelle: 'Français', coef: 3 },
    { libelle: 'Anglais Commercial', coef: 2 },
    { libelle: 'Histoire / Géographie', coef: 1 },
    { libelle: 'Éducation Physique', coef: 1 },
  ];

  const allMatiereNames = Array.from(
    new Set([...matieresScientifiques.map((m) => m.libelle), ...matieresCommerciales.map((m) => m.libelle)]),
  );

  const matieresMap = new Map<string, any>();
  for (const libelle of allMatiereNames) {
    const mat = await prisma.matiere.create({ data: { libelle } });
    matieresMap.set(libelle, mat);
  }

  // Associer les matières scientifiques à TOUTES les classes scientifiques (tronc commun + spécialisées)
  const scClasses = [...classesScientifique, ...classesMathPhys, ...classesChimieBio];
  for (const scCl of scClasses) {
    const cl = classesMap.get(scCl.libelle);
    for (const m of matieresScientifiques) {
      await prisma.classeMatiere.create({
        data: {
          idClasse: cl.id,
          idMatiere: matieresMap.get(m.libelle).id,
          coefficient: new Prisma.Decimal(m.coef),
        },
      });
    }
  }

  for (const coCl of classesComm) {
    const cl = classesMap.get(coCl.libelle);
    for (const m of matieresCommerciales) {
      await prisma.classeMatiere.create({
        data: {
          idClasse: cl.id,
          idMatiere: matieresMap.get(m.libelle).id,
          coefficient: new Prisma.Decimal(m.coef),
        },
      });
    }
  }

  // ----------------------------------------------------
  // 7. TYPES D'ÉVALUATION
  // ----------------------------------------------------
  console.log('📝 7. Création des types d’évaluation...');
  const typesEval = [
    { libelle: 'Interrogation', ponderation: 1 },
    { libelle: 'Travail Pratique', ponderation: 1 },
    { libelle: 'Devoir', ponderation: 1 },
    { libelle: 'Examen', ponderation: 2 },
  ];

  const typesEvalMap = new Map<string, any>();
  for (const t of typesEval) {
    const te = await prisma.typeEvaluation.create({
      data: {
        libelle: t.libelle,
        ponderation: new Prisma.Decimal(t.ponderation),
      },
    });
    typesEvalMap.set(t.libelle, te);
  }

  // ----------------------------------------------------
  // 8. LISTE ÉLARGIE DES ENSEIGNANTS (25 Enseignants)
  // ----------------------------------------------------
  console.log('👨‍🏫 8. Création de 25 enseignants avec leurs comptes (mdp: prof)...');
  const teacherRoleId = rolesMap.get(CodeRole.TEACHER)!;

  const teachersSeedList = [
    { nom: 'KABAMBA', postnom: 'MUKENDI', prenom: 'Jean', sexe: Sexe.M, tel: '+243810000001', email: 'jean.kabamba@kotaschool.cd', specialite: 'Mathématiques' },
    { nom: 'MBOYO', postnom: 'LOKONDA', prenom: 'Sarah', sexe: Sexe.F, tel: '+243820000002', email: 'sarah.mboyo@kotaschool.cd', specialite: 'Physique' },
    { nom: 'BAKAMBAMBA', postnom: 'TSHILOMBO', prenom: 'Patrick', sexe: Sexe.M, tel: '+243850000003', email: 'patrick.bakambamba@kotaschool.cd', specialite: 'Comptabilité' },
    { nom: 'KASONGO', postnom: 'NUMBI', prenom: 'Grace', sexe: Sexe.F, tel: '+243990000004', email: 'grace.kasongo@kotaschool.cd', specialite: 'Français' },
    { nom: 'ILUNGA', postnom: 'KANIKI', prenom: 'Michel', sexe: Sexe.M, tel: '+243900000005', email: 'michel.ilunga@kotaschool.cd', specialite: 'Histoire' },
    { nom: 'MUTOMBO', postnom: 'MWAMBA', prenom: 'Christian', sexe: Sexe.M, tel: '+243810000006', email: 'christian.mutombo@kotaschool.cd', specialite: 'Biologie' },
    { nom: 'TSHIBANGU', postnom: 'BILONDA', prenom: 'Dorcas', sexe: Sexe.F, tel: '+243820000007', email: 'dorcas.tshibangu@kotaschool.cd', specialite: 'Anglais' },
    { nom: 'MWAMBA', postnom: 'KABILA', prenom: 'David', sexe: Sexe.M, tel: '+243850000008', email: 'david.mwamba@kotaschool.cd', specialite: 'Économie Générale' },
    { nom: 'KANYINDA', postnom: 'MOYOWABO', prenom: 'Emmanuel', sexe: Sexe.M, tel: '+243990000009', email: 'emmanuel.kanyinda@kotaschool.cd', specialite: 'Informatique / TIC' },
    { nom: 'MULUMBA', postnom: 'TSHIBOLA', prenom: 'Sephora', sexe: Sexe.F, tel: '+243900000010', email: 'sephora.mulumba@kotaschool.cd', specialite: 'Droit & Législation' },
    { nom: 'KAYEMBE', postnom: 'BANZA', prenom: 'Daniel', sexe: Sexe.M, tel: '+243810000011', email: 'daniel.kayembe@kotaschool.cd', specialite: 'Statistique' },
    { nom: 'PALUKU', postnom: 'KASEREKA', prenom: 'Eric', sexe: Sexe.M, tel: '+243820000012', email: 'eric.paluku@kotaschool.cd', specialite: 'Chimie' },
    { nom: 'KABENGELE', postnom: 'MASENGU', prenom: 'Rachel', sexe: Sexe.F, tel: '+243850000013', email: 'rachel.kabengele@kotaschool.cd', specialite: 'Mathématiques' },
    { nom: 'KATEMBO', postnom: 'MUHINDO', prenom: 'Isaac', sexe: Sexe.M, tel: '+243990000014', email: 'isaac.katembo@kotaschool.cd', specialite: 'Physique' },
    { nom: 'MBOKANI', postnom: 'BOKETSHU', prenom: 'Fabrice', sexe: Sexe.M, tel: '+243900000015', email: 'fabrice.mbokani@kotaschool.cd', specialite: 'Éducation Physique' },
    { nom: 'LUKUSA', postnom: 'KABEDI', prenom: 'Benie', sexe: Sexe.F, tel: '+243810000016', email: 'benie.lukusa@kotaschool.cd', specialite: 'Français' },
    { nom: 'BUKASA', postnom: 'MBIYE', prenom: 'Serge', sexe: Sexe.M, tel: '+243820000017', email: 'serge.bukasa@kotaschool.cd', specialite: 'Histoire' },
    { nom: 'MUJINGA', postnom: 'MUSAU', prenom: 'Chancelle', sexe: Sexe.F, tel: '+243850000018', email: 'chancelle.mujinga@kotaschool.cd', specialite: 'Anglais Commercial' },
    { nom: 'KASEREKA', postnom: 'KAMBALE', prenom: 'Moïse', sexe: Sexe.M, tel: '+243990000019', email: 'moise.kasereka@kotaschool.cd', specialite: 'Philosophie / EDHC' },
    { nom: 'BOKETSHU', postnom: 'BONTAMBA', prenom: 'Junior', sexe: Sexe.M, tel: '+243900000020', email: 'junior.boketshu@kotaschool.cd', specialite: 'Biologie' },
    { nom: 'NTUMBA', postnom: 'KASONGO', prenom: 'Ruth', sexe: Sexe.F, tel: '+243810000021', email: 'ruth.ntumba@kotaschool.cd', specialite: 'Chimie' },
    { nom: 'LUMUMBA', postnom: 'KALALA', prenom: 'Cedric', sexe: Sexe.M, tel: '+243820000022', email: 'cedric.lumumba@kotaschool.cd', specialite: 'Géographie' },
    { nom: 'MALU', postnom: 'TSHIMBALANGA', prenom: 'Naomi', sexe: Sexe.F, tel: '+243850000023', email: 'naomi.malu@kotaschool.cd', specialite: 'Mathématiques Financières' },
    { nom: 'KITENGE', postnom: 'KYUNGU', prenom: 'Hervé', sexe: Sexe.M, tel: '+243990000024', email: 'herve.kitenge@kotaschool.cd', specialite: 'Commercial & Correspondance' },
    { nom: 'TSHIELA', postnom: 'NSAPU', prenom: 'Divine', sexe: Sexe.F, tel: '+243900000025', email: 'divine.tshiela@kotaschool.cd', specialite: 'Informatique de Gestion' },
  ];

  const teachersMap = new Map<string, any>();
  for (const t of teachersSeedList) {
    const enseignant = await prisma.enseignant.create({
      data: {
        nom: t.nom,
        postnom: t.postnom,
        prenom: t.prenom,
        sexe: t.sexe,
        telephone: t.tel,
        email: t.email,
        estActif: true,
      },
    });

    await prisma.utilisateur.create({
      data: {
        nomUtilisateur: t.email,
        email: t.email,
        motDePasse: profPasswordHash,
        idRole: teacherRoleId,
        enseignantId: enseignant.id,
        estActif: true,
      },
    });
    teachersMap.set(t.email, enseignant);
  }
  console.log(`   ✔️ 25 enseignants créés avec succès.`);

  // ----------------------------------------------------
  // 9. AFFECTATIONS COMPLÈTES POUR TOUTES LES CLASSES
  // ----------------------------------------------------
  console.log('📌 9. Création des affectations enseignants pour toutes les classes...');

  const allClasseMatieres = await prisma.classeMatiere.findMany({
    include: { classe: true, matiere: true },
  });

  const teacherByMatiere: Record<string, string[]> = {
    'Mathématiques': ['jean.kabamba@kotaschool.cd', 'rachel.kabengele@kotaschool.cd'],
    'Physique': ['sarah.mboyo@kotaschool.cd', 'isaac.katembo@kotaschool.cd'],
    'Chimie': ['eric.paluku@kotaschool.cd', 'sarah.mboyo@kotaschool.cd', 'ruth.ntumba@kotaschool.cd'],
    'Biologie': ['christian.mutombo@kotaschool.cd', 'junior.boketshu@kotaschool.cd'],
    'Français': ['grace.kasongo@kotaschool.cd', 'benie.lukusa@kotaschool.cd'],
    'Anglais': ['dorcas.tshibangu@kotaschool.cd'],
    'Informatique / TIC': ['emmanuel.kanyinda@kotaschool.cd', 'jean.kabamba@kotaschool.cd'],
    'Histoire': ['michel.ilunga@kotaschool.cd', 'serge.bukasa@kotaschool.cd'],
    'Géographie': ['cedric.lumumba@kotaschool.cd', 'michel.ilunga@kotaschool.cd'],
    'Philosophie / EDHC': ['moise.kasereka@kotaschool.cd'],
    'Éducation Physique': ['fabrice.mbokani@kotaschool.cd'],
    'Comptabilité': ['patrick.bakambamba@kotaschool.cd'],
    'Mathématiques Financières': ['naomi.malu@kotaschool.cd', 'patrick.bakambamba@kotaschool.cd'],
    'Économie Générale': ['david.mwamba@kotaschool.cd'],
    'Commercial & Correspondance': ['herve.kitenge@kotaschool.cd'],
    'Informatique de Gestion': ['divine.tshiela@kotaschool.cd', 'emmanuel.kanyinda@kotaschool.cd'],
    'Droit & Législation': ['sephora.mulumba@kotaschool.cd'],
    'Statistique': ['daniel.kayembe@kotaschool.cd'],
    'Anglais Commercial': ['chancelle.mujinga@kotaschool.cd', 'dorcas.tshibangu@kotaschool.cd'],
    'Histoire / Géographie': ['serge.bukasa@kotaschool.cd', 'michel.ilunga@kotaschool.cd'],
  };

  const affectationsMap = new Map<string, any>(); // key = `${classeLibelle}_${matiereLibelle}`
  let affIndex = 0;

  for (const cm of allClasseMatieres) {
    const list = teacherByMatiere[cm.matiere.libelle] ?? [teachersSeedList[0].email];
    const teacherEmail = list[affIndex % list.length];
    affIndex++;
    const teacher = teachersMap.get(teacherEmail);

    const aff = await prisma.affectation.create({
      data: {
        idEnseignant: teacher.id,
        idClasseMatiere: cm.id,
        idAnnee: annee.id,
      },
    });
    affectationsMap.set(`${cm.classe.libelle}_${cm.matiere.libelle}`, aff);
  }
  console.log(`   ✔️ ${allClasseMatieres.length} affectations créées (couverture 100% des matières/classes).`);

  // ----------------------------------------------------
  // 10. GÉNÉRATION MASSIF DES ÉLÈVES (~200 Élèves)
  // ----------------------------------------------------
  console.log('🎓 10. Génération d’environ 200 élèves répartis sur les 12 classes (mdp: student)...');
  const studentRoleId = rolesMap.get(CodeRole.STUDENT)!;

  const congoleseNoms = [
    'MUKENDI', 'NGOY', 'MBALA', 'MASIKA', 'KAPANGA', 'LOKOTA', 'YAMBA', 'MUTOMBO', 'MWAMBA', 'KAYEMBE',
    'KABENGELE', 'MBAYO', 'KANYINDA', 'TSHIBANGU', 'KADIMA', 'MULUMBA', 'LUMUMBA', 'KAZADI', 'MPYANA', 'BOKETSHU',
    'MBOKANI', 'KITENGE', 'BUKASA', 'MALU', 'NTUMBA', 'KANKU', 'TSHIELA', 'MUJINGA', 'KAPINGA', 'MIANDABU',
    'LUKUSA', 'BEYA', 'TSHIMBALANGA', 'KAMBALE', 'PALUKU', 'KASEREKA', 'KAKULE', 'KATEMBO', 'MUHINDO', 'KAVUO'
  ];

  const congolesePostnoms = [
    'KABEYA', 'KALALA', 'LUZOLO', 'KAVIRA', 'TSHIMANGA', 'BONTAMBA', 'BASHALA', 'MWAMBA', 'KASONGO', 'ILUNGA',
    'NGOY', 'KABILA', 'MOYOWABO', 'BILONDA', 'TSHIBOLA', 'MBOMBO', 'MASENGU', 'KABEDI', 'MUSAU', 'KASONGA',
    'BANZA', 'KYUNGU', 'KALENGA', 'NGOIE', 'MWEPU', 'KABWE', 'LENGE', 'KABULO', 'TSHIBASU', 'MBIYE',
    'NSAPU', 'BIAYA', 'KANKOLONGO', 'LOKONDA', 'MUKENDI', 'NUMBI', 'KANIKI', 'TSHILOMBO'
  ];

  const firstnamesM = [
    'Dieudonné', 'Jonathan', 'Samuel', 'Kevin', 'Christian', 'David', 'Daniel', 'Emmanuel', 'Eric', 'Franck',
    'Gabriel', 'Isaac', 'Joel', 'Nathan', 'Paul', 'Serge', 'Yves', 'Alain', 'Cedric', 'Fabrice',
    'Hervé', 'Junior', 'Marc', 'Rodrigue', 'Yannick', 'Moïse', 'Aaron', 'Patrick', 'Jean', 'Michel'
  ];

  const firstnamesF = [
    'Clarisse', 'Esther', 'Patricia', 'Naomi', 'Rachel', 'Ruth', 'Deborah', 'Dorcas', 'Sephora', 'Rebecca',
    'Syntyche', 'Gracia', 'Chancelle', 'Jemima', 'Eunice', 'Benie', 'Divine', 'Gloria', 'Priscille', 'Exaucée',
    'Merdi', 'Kerene', 'Ketia', 'Gemima', 'Brenda', 'Vanessa', 'Blandine', 'Ornella', 'Sarah', 'Grace'
  ];

  const villes = ['Kinshasa', 'Lubumbashi', 'Goma', 'Matadi', 'Kananga', 'Kisangani', 'Mbuji-Mayi', 'Bukavu', 'Mbandaka', 'Kolwezi', 'Tshikapa', 'Kikwit'];
  const communes = ['Lemba', 'Gombe', 'N\'djili', 'Ngaba', 'Lingwala', 'Bandalungwa', 'Kalamu', 'Limete', 'Kasa-Vubu', 'Mont-Ngafula', 'Barumbu', 'Ngaliema', 'Matonge', 'Kintambo'];

  const allClasseNames = [
    // Tronc commun Scientifique (1ère & 2ème)
    '1ère Scientifique', '2ème Scientifique',
    // Spécialisation Mathématiques–Physique (3ème & 4ème)
    '3ème Math-Physique', '4ème Math-Physique',
    // Spécialisation Chimie-Biologie (3ème & 4ème)
    '3ème Chimie-Biologie', '4ème Chimie-Biologie',
    // Section Commerciale et Gestion
    '1ère Commerciale', '2ème Commerciale', '3ème Commerciale', '4ème Commerciale',
  ];

  let matriculeCounter = 1;
  const usedStudentEmails = new Set<string>();
  const inscriptionsByClasse = new Map<string, any[]>();
  const allInscriptionsMap = new Map<string, any>(); // key = matricule

  for (const classeLibelle of allClasseNames) {
    const targetClasse = classesMap.get(classeLibelle);
    const studentsInClass: any[] = [];
    const countForClass = 17; // 17 élèves par classe => ~204 élèves au total !

    for (let j = 0; j < countForClass; j++) {
      const matricule = `KOT-2026-${String(matriculeCounter).padStart(3, '0')}`;
      let nom: string;
      let postnom: string;
      let prenom: string;
      let sexe: Sexe;

      if (matriculeCounter === 1) {
        // Cas d'exemple explicite demandé par l'utilisateur
        nom = 'BEYA';
        postnom = 'MBOMBO';
        prenom = 'Gloria';
        sexe = Sexe.F;
      } else {
        const isM = (matriculeCounter % 2 === 1);
        sexe = isM ? Sexe.M : Sexe.F;
        prenom = isM ? firstnamesM[(matriculeCounter + j) % firstnamesM.length] : firstnamesF[(matriculeCounter + j) % firstnamesF.length];
        nom = congoleseNoms[(matriculeCounter * 3 + j) % congoleseNoms.length];
        postnom = congolesePostnoms[(matriculeCounter * 2 + j) % congolesePostnoms.length];
      }

      // Format d'email simplifié et intuitif: nom.postnom.prenom@kotaschool.cd
      const postSanitized = postnom ? sanitize(postnom) : '';
      const baseEmail = postSanitized
        ? `${sanitize(nom)}.${postSanitized}.${sanitize(prenom)}@kotaschool.cd`
        : `${sanitize(nom)}.${sanitize(prenom)}@kotaschool.cd`;

      let email = baseEmail;
      let cIdx = 2;
      while (usedStudentEmails.has(email)) {
        email = postSanitized
          ? `${sanitize(nom)}.${postSanitized}.${sanitize(prenom)}${cIdx}@kotaschool.cd`
          : `${sanitize(nom)}.${sanitize(prenom)}${cIdx}@kotaschool.cd`;
        cIdx++;
      }
      usedStudentEmails.add(email);

      // Année de naissance réaliste selon le niveau (1ère = ~15 ans, 4ème = ~18 ans)
      const niveauOffset = classeLibelle.startsWith('1ère') ? 3 : classeLibelle.startsWith('2ème') ? 2 : classeLibelle.startsWith('3ème') ? 1 : 0;
      const birthYear = 2008 + niveauOffset;
      const birthMonth = (j % 12) + 1;
      const birthDay = ((j * 3) % 27) + 1;
      const dateNaissance = new Date(`${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`);
      const lieuNaissance = villes[(matriculeCounter + j) % villes.length];
      const adresse = `Av. ${communes[(matriculeCounter * 2) % communes.length]} n° ${10 + j * 4}, ${communes[j % communes.length]}`;

      const eleve = await prisma.eleve.create({
        data: {
          matricule,
          nom,
          postnom,
          prenom,
          sexe,
          dateNaissance,
          lieuNaissance,
          adresse,
          estActif: true,
        },
      });

      await prisma.utilisateur.create({
        data: {
          nomUtilisateur: email,
          email,
          motDePasse: studentPasswordHash,
          idRole: studentRoleId,
          eleveId: eleve.matricule,
          estActif: true,
        },
      });

      const inscription = await prisma.inscription.create({
        data: {
          matricule: eleve.matricule,
          idClasse: targetClasse.id,
          idAnnee: annee.id,
        },
      });

      studentsInClass.push({ eleve, inscription, email, matricule, prenom, nom });
      allInscriptionsMap.set(matricule, inscription);
      matriculeCounter++;
    }

    inscriptionsByClasse.set(classeLibelle, studentsInClass);
  }

  console.log(`   ✔️ ${matriculeCounter - 1} élèves créés avec succès et inscrits sur l'ensemble des 12 classes !`);

  // ----------------------------------------------------
  // 11. ÉVALUATIONS ET NOTES POUR TOUTES LES CLASSES (SEMESTRE 1 & SEMESTRE 2)
  // ----------------------------------------------------
  console.log('✍️ 11. Génération complète des évaluations et notes (S1: P1 & P2, S2: P3 & P4) pour les 12 classes...');

  // Configuration des évaluations par semestre et période (avec Session d'Examens semestriels)
  const evalConfigs: {
    semestre: any;
    periode: any | null;
    typeLib: string;
    suffix: string;
    pond: number;
    date: Date;
  }[] = [
    // SEMESTRE 1
    { semestre: semestre1, periode: p1, typeLib: 'Interrogation', suffix: 'P1 - Interrogation 1', pond: 1, date: new Date('2026-10-15') },
    { semestre: semestre1, periode: p1, typeLib: 'Travail Pratique', suffix: 'P1 - TP 1', pond: 1, date: new Date('2026-10-28') },
    { semestre: semestre1, periode: p2, typeLib: 'Interrogation', suffix: 'P2 - Interrogation 1', pond: 1, date: new Date('2026-12-10') },
    { semestre: semestre1, periode: null, typeLib: 'Examen', suffix: 'Examen 1er Semestre', pond: 2, date: new Date('2027-01-15') },
    // SEMESTRE 2
    { semestre: semestre2, periode: p3, typeLib: 'Interrogation', suffix: 'P3 - Interrogation 1', pond: 1, date: new Date('2027-02-15') },
    { semestre: semestre2, periode: p3, typeLib: 'Travail Pratique', suffix: 'P3 - TP 1', pond: 1, date: new Date('2027-03-01') },
    { semestre: semestre2, periode: p4, typeLib: 'Interrogation', suffix: 'P4 - Interrogation 1', pond: 1, date: new Date('2027-05-15') },
    { semestre: semestre2, periode: null, typeLib: 'Examen', suffix: 'Examen 2ème Semestre', pond: 2, date: new Date('2027-06-20') },
  ];

  // Notes de base réparties pour les 17 élèves d'une classe pour créer des moyennes et classements réalistes
  const baseStudentGrades = [17.8, 16.9, 16.1, 15.4, 14.8, 14.2, 13.6, 13.0, 12.5, 11.9, 11.3, 10.8, 10.2, 9.6, 9.0, 8.4, 7.8];

  const allNotesToInsert: any[] = [];
  const evaluationsBySemAndClasse = new Map<string, any[]>(); // key: `${semestreId}_${classeLibelle}`

  for (const cLibelle of allClasseNames) {
    const students = inscriptionsByClasse.get(cLibelle) ?? [];
    const cl = classesMap.get(cLibelle);
    const cms = await prisma.classeMatiere.findMany({
      where: { idClasse: cl.id },
      include: { matiere: true },
    });

    for (const cm of cms) {
      const aff = affectationsMap.get(`${cLibelle}_${cm.matiere.libelle}`);
      if (!aff) continue;

      let cfgIdx = 0;
      for (const cfg of evalConfigs) {
        cfgIdx++;
        const typeLibelle = cfg.typeLib === 'Travail Pratique' && cLibelle.includes('Commerciale') ? 'Devoir' : cfg.typeLib;
        const typeEval = typesEvalMap.get(typeLibelle) ?? typesEvalMap.get('Interrogation');

        const evaluation = await prisma.evaluation.create({
          data: {
            libelle: `${cm.matiere.libelle} (${cfg.suffix})`,
            idAffectation: aff.id,
            idPeriode: cfg.periode ? cfg.periode.id : null,
            idSemestre: cfg.semestre.id,
            idTypeEvaluation: typeEval.id,
            maximum: new Prisma.Decimal(20),
            ponderation: new Prisma.Decimal(cfg.pond),
            dateEvaluation: cfg.date,
            statut: StatutEvaluation.VALIDEE,
          },
        });

        const semClassKey = `${cfg.semestre.id}_${cLibelle}`;
        if (!evaluationsBySemAndClasse.has(semClassKey)) {
          evaluationsBySemAndClasse.set(semClassKey, []);
        }
        evaluationsBySemAndClasse.get(semClassKey)!.push({ evaluation, cm, aff, periodeId: cfg.periode ? cfg.periode.id : null, pond: cfg.pond, isExam: !cfg.periode });

        for (let sIdx = 0; sIdx < students.length; sIdx++) {
          const studentObj = students[sIdx];
          const base = baseStudentGrades[sIdx % baseStudentGrades.length];
          const subjectVariation = ((cm.matiere.libelle.length * 5 + sIdx * 3 + cfgIdx * 7) % 7) * 0.5 - 1.5;
          const evalVariation = ((cfgIdx * 3 + sIdx) % 5) * 0.4 - 0.8;
          const finalNote = Math.min(20, Math.max(6.5, round2(base + subjectVariation + evalVariation)));

          allNotesToInsert.push({
            id: randomUUID(),
            valeurNote: new Prisma.Decimal(finalNote),
            observation: finalNote >= 16 ? 'Très bien' : finalNote >= 12 ? 'Bien' : finalNote >= 10 ? 'Passable' : 'Insuffisant',
            estValide: true,
            valideParId: adminUser.id,
            dateValidation: new Date(),
            idInscription: studentObj.inscription.id,
            idEvaluation: evaluation.id,
          });
        }
      }
    }
  }

  // Insertion par lots des notes pour une vitesse maximale
  console.log(`   📦 Insertion par lots de ${allNotesToInsert.length} notes validées...`);
  const batchSize = 2000;
  for (let i = 0; i < allNotesToInsert.length; i += batchSize) {
    const chunk = allNotesToInsert.slice(i, i + batchSize);
    await prisma.note.createMany({ data: chunk });
  }
  console.log(`   ✔️ ${allNotesToInsert.length} notes insérées avec succès !`);

  // ----------------------------------------------------
  // 12. CALCUL ET GÉNÉRATION AUTOMATIQUE DES BULLETINS (SEMESTRE 1 & SEMESTRE 2)
  // ----------------------------------------------------
  console.log('🏆 12. Calcul automatique et publication des bulletins semestriels (S1 & S2) pour toutes les classes...');

  const semestresToProcess = [
    { sem: semestre1, periodes: [p1.id, p2.id] },
    { sem: semestre2, periodes: [p3.id, p4.id] },
  ];

  const bulletinsToInsert: any[] = [];

  // Mettre les notes insérées en cache mémoire pour calculer les bulletins instantanément
  const notesCache = new Map<string, number>();
  for (const n of allNotesToInsert) {
    notesCache.set(`${n.idInscription}_${n.idEvaluation}`, Number(n.valeurNote));
  }

  for (const { sem, periodes } of semestresToProcess) {
    for (const cLibelle of allClasseNames) {
      const students = inscriptionsByClasse.get(cLibelle) ?? [];
      const cl = classesMap.get(cLibelle);
      const cms = await prisma.classeMatiere.findMany({
        where: { idClasse: cl.id },
        include: { matiere: true },
      });

      const semClassKey = `${sem.id}_${cLibelle}`;
      const evalsForClassSem = evaluationsBySemAndClasse.get(semClassKey) ?? [];

      const evalsByCm = new Map<string, any[]>();
      for (const item of evalsForClassSem) {
        if (!evalsByCm.has(item.cm.id)) evalsByCm.set(item.cm.id, []);
        evalsByCm.get(item.cm.id)!.push(item);
      }

      const computedBulletins: {
        inscriptionId: string;
        totalObtenu: number;
        totalMaximum: number;
        pourcentage: number;
        rang?: number;
      }[] = [];

      for (const studentObj of students) {
        let totalObtenu = 0;
        let totalMaximum = 0;

        for (const cm of cms) {
          const evals = evalsByCm.get(cm.id) ?? [];
          if (evals.length === 0) continue;

          let sumPeriodes = 0;
          let countEvaluatedPeriodes = 0;

          for (const pId of periodes) {
            const pEvals = evals.filter((e) => e.periodeId === pId);
            if (pEvals.length === 0) continue;

            let sumWeighted = 0;
            let sumWeights = 0;
            for (const ev of pEvals) {
              const noteVal = notesCache.get(`${studentObj.inscription.id}_${ev.evaluation.id}`) ?? 10;
              sumWeighted += noteVal * ev.pond;
              sumWeights += ev.pond;
            }
            const notePeriode = sumWeights === 0 ? 0 : round2(sumWeighted / sumWeights);
            sumPeriodes += notePeriode;
            countEvaluatedPeriodes += 1;
          }

          const examEvals = evals.filter((e) => e.isExam);
          let sumSemestre = sumPeriodes;
          let weightSemestre = countEvaluatedPeriodes;

          for (const ev of examEvals) {
            const noteVal = notesCache.get(`${studentObj.inscription.id}_${ev.evaluation.id}`) ?? 10;
            sumSemestre += noteVal * 2; // Examen compte double (norme RDC EPSP)
            weightSemestre += 2;
          }

          const noteMatiere = weightSemestre === 0 ? 0 : round2(sumSemestre / weightSemestre);
          const coefficient = Number(cm.coefficient);
          const noteBulletin = round2(noteMatiere * coefficient);

          totalObtenu += noteBulletin;
          totalMaximum += coefficient * 20;
        }

        const pourcentage = totalMaximum === 0 ? 0 : round2((totalObtenu / totalMaximum) * 100);
        computedBulletins.push({
          inscriptionId: studentObj.inscription.id,
          totalObtenu: round2(totalObtenu),
          totalMaximum,
          pourcentage,
        });
      }

      // Classement de la classe
      computedBulletins.sort((a, b) => b.pourcentage - a.pourcentage);
      computedBulletins.forEach((c, idx) => {
        c.rang = idx + 1;
      });

      for (const c of computedBulletins) {
        bulletinsToInsert.push({
          id: randomUUID(),
          type: TypeBulletin.SEMESTRE,
          totalObtenu: new Prisma.Decimal(c.totalObtenu),
          totalMaximum: new Prisma.Decimal(c.totalMaximum),
          pourcentage: new Prisma.Decimal(c.pourcentage),
          rang: c.rang,
          decision: c.pourcentage >= 50 ? 'Réussi' : 'Non réussi',
          idInscription: c.inscriptionId,
          idSemestre: sem.id,
          idAnnee: annee.id,
        });
      }
    }
  }

  console.log(`   📦 Insertion par lots de ${bulletinsToInsert.length} bulletins calculés...`);
  for (let i = 0; i < bulletinsToInsert.length; i += 1000) {
    const chunk = bulletinsToInsert.slice(i, i + 1000);
    await prisma.bulletin.createMany({ data: chunk });
  }
  console.log(`   ✔️ ${bulletinsToInsert.length} bulletins générés et publiés pour S1 et S2 !`);

  // ----------------------------------------------------
  // 13. BULLETINS ANNUELS (S1 + S2 combinés — EPSP Congo)
  // ----------------------------------------------------
  console.log('🎓 13. Génération des bulletins annuels (S1 + S2 combinés, système EPSP Congo)...');

  // Récupérer les bulletins S1 et S2 depuis les tableaux déjà construits
  const bulletinsS1 = bulletinsToInsert.filter((b: any) => b.idSemestre === semestre1.id);
  const bulletinsS2 = bulletinsToInsert.filter((b: any) => b.idSemestre === semestre2.id);

  // Index par inscriptionId
  const mapS1 = new Map<string, any>(bulletinsS1.map((b: any) => [b.idInscription, b]));
  const mapS2 = new Map<string, any>(bulletinsS2.map((b: any) => [b.idInscription, b]));

  // Regrouper par classe
  const annualByClasse = new Map<string, { inscriptionId: string; totalObtenu: number; totalMaximum: number; pourcentage: number; rang?: number }[]>();

  for (const cLibelle of allClasseNames) {
    const students = inscriptionsByClasse.get(cLibelle) ?? [];
    const annualList: { inscriptionId: string; totalObtenu: number; totalMaximum: number; pourcentage: number; rang?: number }[] = [];

    for (const studentObj of students) {
      const bS1 = mapS1.get(studentObj.inscription.id);
      const bS2 = mapS2.get(studentObj.inscription.id);
      if (!bS1 || !bS2) continue;

      const totalObtenu = round2(Number(bS1.totalObtenu) + Number(bS2.totalObtenu));
      const totalMaximum = Number(bS1.totalMaximum) + Number(bS2.totalMaximum);
      const pourcentage = totalMaximum === 0 ? 0 : round2((totalObtenu / totalMaximum) * 100);
      annualList.push({ inscriptionId: studentObj.inscription.id, totalObtenu, totalMaximum, pourcentage });
    }

    // Classement de la classe
    annualList.sort((a, b) => b.pourcentage - a.pourcentage);
    annualList.forEach((c, idx) => { c.rang = idx + 1; });
    annualByClasse.set(cLibelle, annualList);
  }

  const getMention = (pct: number): string => {
    if (pct >= 80) return 'Grande Distinction';
    if (pct >= 70) return 'Distinction';
    if (pct >= 60) return 'Satisfaction';
    if (pct >= 50) return 'Réussi';
    return 'Non réussi';
  };

  const annualBulletinsToInsert: any[] = [];
  for (const annualList of annualByClasse.values()) {
    for (const c of annualList) {
      annualBulletinsToInsert.push({
        id: randomUUID(),
        type: TypeBulletin.ANNUEL,
        totalObtenu: new Prisma.Decimal(c.totalObtenu),
        totalMaximum: new Prisma.Decimal(c.totalMaximum),
        pourcentage: new Prisma.Decimal(c.pourcentage),
        rang: c.rang,
        decision: getMention(c.pourcentage),
        idInscription: c.inscriptionId,
        idSemestre: null,
        idAnnee: annee.id,
      });
    }
  }

  console.log(`   📦 Insertion de ${annualBulletinsToInsert.length} bulletins annuels...`);
  for (let i = 0; i < annualBulletinsToInsert.length; i += 1000) {
    await prisma.bulletin.createMany({ data: annualBulletinsToInsert.slice(i, i + 1000) });
  }
  console.log(`   ✔️ ${annualBulletinsToInsert.length} bulletins annuels insérés avec rangs et mentions EPSP !`);

  console.log('====================================================');
  console.log('✅ SEEDING MASSIF TERMINÉ AVEC SUCCÈS !');
  console.log('====================================================');
  console.log(`- Administrateur: ${adminEmail} (Mot de passe: MALANDA100)`);
  console.log(`- Enseignants   : ${teachersSeedList.length} créés (Mot de passe: prof)`);
  console.log(`- Élèves        : ${matriculeCounter - 1} créés et inscrits (Mot de passe: student)`);
  console.log(`- Classes       : 10 classes (Tronc commun: 2 Scientifique | Math-Physique: 2 | Chimie-Bio: 2 | Commerciale: 4)`);
  console.log(`- Affectations  : ${allClasseMatieres.length} affectations (100% des matières attribuées)`);
  console.log(`- Bulletins     : Pré-calculés avec rangs pour les promotions complètes`);
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

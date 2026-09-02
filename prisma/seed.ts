import { PrismaClient, CodeRole, Sexe, StatutEvaluation, TypeBulletin, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

async function main() {
  console.log('====================================================');
  console.log('🌱 Démarrage du Seeding complet de Kotaschool...');
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

  // ----------------------------------------------------
  // 3. COMPTE ADMINISTRATEUR PAR DÉFAUT
  // ----------------------------------------------------
  console.log('👤 3. Création du compte administrateur...');
  const adminEmail = 'fordimalanda7@gmail.com';
  const adminPasswordHash = await bcrypt.hash('MALANDA100', 12);

  const adminUser = await prisma.utilisateur.create({
    data: {
      nomUtilisateur: adminEmail,
      email: adminEmail,
      motDePasse: adminPasswordHash,
      idRole: rolesMap.get(CodeRole.ADMIN)!,
      estActif: true,
    },
  });
  console.log(`   ✔️ Admin créé: ${adminEmail} (Role: ADMIN)`);

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

  await prisma.periode.create({
    data: {
      libelle: 'Troisième Période - P3',
      idSemestre: semestre2.id,
    },
  });

  await prisma.periode.create({
    data: {
      libelle: 'Quatrième Période - P4',
      idSemestre: semestre2.id,
    },
  });

  // ----------------------------------------------------
  // 5. STRUCTURE ACADÉMIQUE (Sections, Options, Classes)
  // ----------------------------------------------------
  console.log('🏫 5. Création des sections, options et classes...');

  // A. Section Scientifique
  const secScientifique = await prisma.section.create({
    data: { libelle: 'Scientifique' },
  });

  const optMathPhysique = await prisma.option.create({
    data: { libelle: 'Mathématiques–Physique', idSection: secScientifique.id },
  });

  const optChimieBio = await prisma.option.create({
    data: { libelle: 'Chimie-Biologie', idSection: secScientifique.id },
  });

  // B. Section Commerciale
  const secCommerciale = await prisma.section.create({
    data: { libelle: 'Commerciale et Gestion' },
  });

  const optCommerciale = await prisma.option.create({
    data: { libelle: 'Commerciale et Gestion', idSection: secCommerciale.id },
  });

  // Classes map: key = libelle, value = Classe
  const classesMap = new Map<string, any>();

  // Classes Math-Physique
  const classesMathPhys = [
    { libelle: '1ère Scientifique', niveau: '1ère' },
    { libelle: '2ème Scientifique', niveau: '2ème' },
    { libelle: '3ème Math-Physique', niveau: '3ème' },
    { libelle: '4ème Math-Physique', niveau: '4ème' },
  ];
  for (const c of classesMathPhys) {
    const cl = await prisma.classe.create({
      data: { libelle: c.libelle, niveau: c.niveau, idOption: optMathPhysique.id },
    });
    classesMap.set(c.libelle, cl);
  }

  // Classes Chimie-Biologie
  const classesChimieBio = [
    { libelle: '1ère Chimie-Biologie', niveau: '1ère' },
    { libelle: '2ème Chimie-Biologie', niveau: '2ème' },
    { libelle: '3ème Chimie-Biologie', niveau: '3ème' },
    { libelle: '4ème Chimie-Biologie', niveau: '4ème' },
  ];
  for (const c of classesChimieBio) {
    const cl = await prisma.classe.create({
      data: { libelle: c.libelle, niveau: c.niveau, idOption: optChimieBio.id },
    });
    classesMap.set(c.libelle, cl);
  }

  // Classes Commerciale
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

  // Regrouper et créer toutes les matières uniques
  const allMatiereNames = Array.from(
    new Set([...matieresScientifiques.map((m) => m.libelle), ...matieresCommerciales.map((m) => m.libelle)]),
  );

  const matieresMap = new Map<string, any>();
  for (const libelle of allMatiereNames) {
    const mat = await prisma.matiere.create({ data: { libelle } });
    matieresMap.set(libelle, mat);
  }

  // Association Classe-Matière pour toutes les classes scientifiques (Math-Phys & Chimie-Bio)
  const scClasses = [...classesMathPhys, ...classesChimieBio];
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

  // Association Classe-Matière pour toutes les classes commerciales
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
  // 8. ENSEIGNANTS ET LEURS COMPTES D'ACCÈS
  // ----------------------------------------------------
  console.log('👨‍🏫 8. Création des enseignants et comptes utilisateurs (mdp: prof)...');
  const profPasswordHash = await bcrypt.hash('prof', 12);
  const teacherRoleId = rolesMap.get(CodeRole.TEACHER)!;

  const teachersData = [
    { nom: 'KABAMBA', postnom: 'MUKENDI', prenom: 'Jean', sexe: Sexe.M, telephone: '+243810000001', email: 'jean.kabamba@kotaschool.cd' },
    { nom: 'MBOYO', postnom: 'LOKONDA', prenom: 'Sarah', sexe: Sexe.F, telephone: '+243820000002', email: 'sarah.mboyo@kotaschool.cd' },
    { nom: 'BAKAMBAMBA', postnom: 'TSHILOMBO', prenom: 'Patrick', sexe: Sexe.M, telephone: '+243850000003', email: 'patrick.bakambamba@kotaschool.cd' },
    { nom: 'KASONGO', postnom: 'NUMBI', prenom: 'Grace', sexe: Sexe.F, telephone: '+243990000004', email: 'grace.kasongo@kotaschool.cd' },
    { nom: 'ILUNGA', postnom: 'KANIKI', prenom: 'Michel', sexe: Sexe.M, telephone: '+243900000005', email: 'michel.ilunga@kotaschool.cd' },
  ];

  const teachersMap = new Map<string, any>();
  for (const t of teachersData) {
    const enseignant = await prisma.enseignant.create({
      data: {
        nom: t.nom,
        postnom: t.postnom,
        prenom: t.prenom,
        sexe: t.sexe,
        telephone: t.telephone,
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
    console.log(`   ✔️ Professeur: ${t.prenom} ${t.nom} (${t.email})`);
  }

  // ----------------------------------------------------
  // 9. AFFECTATIONS ENSEIGNANTS (2026–2027)
  // ----------------------------------------------------
  console.log('📌 9. Création des affectations enseignants...');

  async function getClasseMatiereId(classeLibelle: string, matiereLibelle: string): Promise<string> {
    const cl = classesMap.get(classeLibelle);
    const mat = matieresMap.get(matiereLibelle);
    const cm = await prisma.classeMatiere.findUniqueOrThrow({
      where: { idClasse_idMatiere: { idClasse: cl.id, idMatiere: mat.id } },
    });
    return cm.id;
  }

  const affectationsData = [
    { teacherEmail: 'jean.kabamba@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Mathématiques' },
    { teacherEmail: 'jean.kabamba@kotaschool.cd', classe: '3ème Math-Physique', matiere: 'Mathématiques' },
    { teacherEmail: 'jean.kabamba@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Informatique / TIC' },
    { teacherEmail: 'jean.kabamba@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Éducation Physique' },

    { teacherEmail: 'sarah.mboyo@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Physique' },
    { teacherEmail: 'sarah.mboyo@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Chimie' },
    { teacherEmail: 'sarah.mboyo@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Biologie' },

    { teacherEmail: 'grace.kasongo@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Français' },
    { teacherEmail: 'grace.kasongo@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Anglais' },

    { teacherEmail: 'michel.ilunga@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Histoire' },
    { teacherEmail: 'michel.ilunga@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Géographie' },
    { teacherEmail: 'michel.ilunga@kotaschool.cd', classe: '4ème Math-Physique', matiere: 'Philosophie / EDHC' },

    { teacherEmail: 'patrick.bakambamba@kotaschool.cd', classe: '4ème Commerciale', matiere: 'Comptabilité' },
  ];

  const affectationsMap = new Map<string, any>(); // key: `${classe}_${matiere}`
  for (const aff of affectationsData) {
    const teacher = teachersMap.get(aff.teacherEmail);
    const cmId = await getClasseMatiereId(aff.classe, aff.matiere);
    const createdAff = await prisma.affectation.create({
      data: {
        idEnseignant: teacher.id,
        idClasseMatiere: cmId,
        idAnnee: annee.id,
      },
    });
    affectationsMap.set(`${aff.classe}_${aff.matiere}`, createdAff);
  }

  // ----------------------------------------------------
  // 10. ÉLÈVES ET INSCRIPTIONS (2026–2027)
  // ----------------------------------------------------
  console.log('🎓 10. Création des élèves et inscriptions (mdp: student)...');
  const studentPasswordHash = await bcrypt.hash('student', 12);
  const studentRoleId = rolesMap.get(CodeRole.STUDENT)!;

  const studentsData = [
    // 4ème Math-Physique
    {
      matricule: 'KOT-2026-001',
      nom: 'MUKENDI',
      postnom: 'KABEYA',
      prenom: 'Dieudonné',
      sexe: Sexe.M,
      dateNaissance: new Date('2008-03-12'),
      lieuNaissance: 'Kinshasa',
      email: 'dieudonne.mukendi@student.kotaschool.cd',
      adresse: 'Av. Universite n° 12, Lemba',
      classe: '4ème Math-Physique',
    },
    {
      matricule: 'KOT-2026-002',
      nom: 'NGOY',
      postnom: 'KALALA',
      prenom: 'Clarisse',
      sexe: Sexe.F,
      dateNaissance: new Date('2008-08-05'),
      lieuNaissance: 'Lubumbashi',
      email: 'clarisse.ngoy@student.kotaschool.cd',
      adresse: 'Av. Boulevard n° 45, Gombe',
      classe: '4ème Math-Physique',
    },
    {
      matricule: 'KOT-2026-003',
      nom: 'MBALA',
      postnom: 'LUZOLO',
      prenom: 'Jonathan',
      sexe: Sexe.M,
      dateNaissance: new Date('2007-11-19'),
      lieuNaissance: 'Matadi',
      email: 'jonathan.mbala@student.kotaschool.cd',
      adresse: 'Av. Peace n° 88, N\'djili',
      classe: '4ème Math-Physique',
    },
    {
      matricule: 'KOT-2026-004',
      nom: 'MASIKA',
      postnom: 'KAVIRA',
      prenom: 'Esther',
      sexe: Sexe.F,
      dateNaissance: new Date('2009-01-02'),
      lieuNaissance: 'Goma',
      email: 'esther.masika@student.kotaschool.cd',
      adresse: 'Av. Kianza n° 102, Ngaba',
      classe: '4ème Math-Physique',
    },
    {
      matricule: 'KOT-2026-005',
      nom: 'KAPANGA',
      postnom: 'TSHIMANGA',
      prenom: 'Samuel',
      sexe: Sexe.M,
      dateNaissance: new Date('2008-06-14'),
      lieuNaissance: 'Kananga',
      email: 'samuel.kapanga@student.kotaschool.cd',
      adresse: 'Av. Huileries n° 14, Lingwala',
      classe: '4ème Math-Physique',
    },
    // 4ème Commerciale
    {
      matricule: 'KOT-2026-006',
      nom: 'LOKOTA',
      postnom: 'BONTAMBA',
      prenom: 'Patricia',
      sexe: Sexe.F,
      dateNaissance: new Date('2008-07-22'),
      lieuNaissance: 'Mbandaka',
      email: 'patricia.lokota@student.kotaschool.cd',
      adresse: 'Av. Commerciale n° 3, Bandalungwa',
      classe: '4ème Commerciale',
    },
    {
      matricule: 'KOT-2026-007',
      nom: 'YAMBA',
      postnom: 'BASHALA',
      prenom: 'Kevin',
      sexe: Sexe.M,
      dateNaissance: new Date('2008-10-30'),
      lieuNaissance: 'Tshikapa',
      email: 'kevin.yamba@student.kotaschool.cd',
      adresse: 'Av. Victoire n° 21, Kalamu',
      classe: '4ème Commerciale',
    },
  ];

  const inscriptionsMap = new Map<string, any>(); // key = matricule

  for (const s of studentsData) {
    const eleve = await prisma.eleve.create({
      data: {
        matricule: s.matricule,
        nom: s.nom,
        postnom: s.postnom,
        prenom: s.prenom,
        sexe: s.sexe,
        dateNaissance: s.dateNaissance,
        lieuNaissance: s.lieuNaissance,
        adresse: s.adresse,
        estActif: true,
      },
    });

    await prisma.utilisateur.create({
      data: {
        nomUtilisateur: s.email,
        email: s.email,
        motDePasse: studentPasswordHash,
        idRole: studentRoleId,
        eleveId: eleve.matricule,
        estActif: true,
      },
    });

    const targetClasse = classesMap.get(s.classe);
    const inscription = await prisma.inscription.create({
      data: {
        matricule: eleve.matricule,
        idClasse: targetClasse.id,
        idAnnee: annee.id,
      },
    });
    inscriptionsMap.set(s.matricule, inscription);
    console.log(`   ✔️ Élève inscrit: [${s.matricule}] ${s.prenom} ${s.nom} -> ${s.classe}`);
  }

  // ----------------------------------------------------
  // 11. ÉVALUATIONS, NOTES ET VALIDATION (Période 1)
  // ----------------------------------------------------
  console.log('✍️ 11. Création des évaluations et notes pour la 4ème Math-Physique (P1)...');

  // Élèves de la 4ème Math-Physique
  const mathPhysStudents = studentsData.filter((s) => s.classe === '4ème Math-Physique');

  // Config des évaluations par matière dans 4ème Math-Physique
  const evalDefs = [
    {
      matiere: 'Mathématiques',
      evals: [
        { libelle: 'Interrogation 1 - Algèbre', type: 'Interrogation', max: 20, pond: 1, notes: [17, 18.5, 14, 16, 11] },
        { libelle: 'Travail Pratique 1 - Trigonométrie', type: 'Travail Pratique', max: 20, pond: 1, notes: [16, 17, 13, 15.5, 12.5] },
      ],
    },
    {
      matiere: 'Physique',
      evals: [
        { libelle: 'Interrogation 1 - Cinématique', type: 'Interrogation', max: 20, pond: 1, notes: [15.5, 16, 12, 14, 10.5] },
        { libelle: 'Travail Pratique 1 - Optique géométrique', type: 'Travail Pratique', max: 20, pond: 1, notes: [16.5, 17, 13.5, 15, 12] },
      ],
    },
    {
      matiere: 'Chimie',
      evals: [
        { libelle: 'Interrogation 1 - Structure Atomique', type: 'Interrogation', max: 20, pond: 1, notes: [16, 16.5, 14, 15, 11.5] },
      ],
    },
    {
      matiere: 'Biologie',
      evals: [
        { libelle: 'Interrogation 1 - Cytologie', type: 'Interrogation', max: 20, pond: 1, notes: [14.5, 15, 13, 14, 10] },
      ],
    },
    {
      matiere: 'Français',
      evals: [
        { libelle: 'Interrogation 1 - Grammaire & Syntaxe', type: 'Interrogation', max: 20, pond: 1, notes: [15, 17.5, 12.5, 16, 13] },
        { libelle: 'Devoir 1 - Dissertation', type: 'Devoir', max: 20, pond: 1, notes: [16, 17, 13, 15, 12] },
      ],
    },
    {
      matiere: 'Anglais',
      evals: [
        { libelle: 'Interrogation 1 - Reading & Vocabulary', type: 'Interrogation', max: 20, pond: 1, notes: [15.5, 18, 14, 16, 11.5] },
      ],
    },
    {
      matiere: 'Informatique / TIC',
      evals: [
        { libelle: 'Travail Pratique 1 - Algorithmique de base', type: 'Travail Pratique', max: 20, pond: 1, notes: [18, 19, 15, 17, 14] },
      ],
    },
    {
      matiere: 'Histoire',
      evals: [
        { libelle: 'Interrogation 1 - Histoire Contemporaine', type: 'Interrogation', max: 20, pond: 1, notes: [14, 16, 12, 14.5, 11] },
      ],
    },
    {
      matiere: 'Géographie',
      evals: [
        { libelle: 'Interrogation 1 - Géographie Économique', type: 'Interrogation', max: 20, pond: 1, notes: [15, 16.5, 13, 14, 12] },
      ],
    },
    {
      matiere: 'Philosophie / EDHC',
      evals: [
        { libelle: 'Interrogation 1 - Introduction à la Philosophie', type: 'Interrogation', max: 20, pond: 1, notes: [14.5, 15.5, 12, 14, 10.5] },
      ],
    },
    {
      matiere: 'Éducation Physique',
      evals: [
        { libelle: 'Interrogation 1 - Épreuve Pratique Athlétisme', type: 'Interrogation', max: 20, pond: 1, notes: [17, 16, 15, 16.5, 15] },
      ],
    },
  ];

  for (const mDef of evalDefs) {
    const aff = affectationsMap.get(`4ème Math-Physique_${mDef.matiere}`);
    if (!aff) continue;

    for (const evDef of mDef.evals) {
      const typeEval = typesEvalMap.get(evDef.type);
      const evaluation = await prisma.evaluation.create({
        data: {
          libelle: evDef.libelle,
          idAffectation: aff.id,
          idPeriode: p1.id,
          idSemestre: semestre1.id,
          idTypeEvaluation: typeEval.id,
          maximum: new Prisma.Decimal(evDef.max),
          ponderation: new Prisma.Decimal(evDef.pond),
          dateEvaluation: new Date('2026-10-15'),
          statut: StatutEvaluation.VALIDEE,
        },
      });

      // Insérer les notes pour chaque élève
      for (let i = 0; i < mathPhysStudents.length; i++) {
        const student = mathPhysStudents[i];
        const ins = inscriptionsMap.get(student.matricule);
        const noteVal = evDef.notes[i] ?? 12;

        await prisma.note.create({
          data: {
            valeurNote: new Prisma.Decimal(noteVal),
            observation: noteVal >= 16 ? 'Très bien' : noteVal >= 12 ? 'Assez bien' : 'À améliorer',
            estValide: true,
            valideParId: adminUser.id,
            dateValidation: new Date(),
            idInscription: ins.id,
            idEvaluation: evaluation.id,
          },
        });
      }
    }
  }

  // ----------------------------------------------------
  // 12. PRÉ-CALCUL ET ENREGISTREMENT DES BULLETINS (SEMESTRE 1)
  // ----------------------------------------------------
  console.log('🏆 12. Calcul et génération des bulletins semestriels...');

  // Calcul identique à NotesService.recalculateSemestre
  const inscriptions4eme = mathPhysStudents.map((s) => inscriptionsMap.get(s.matricule));
  const clMathPhys = classesMap.get('4ème Math-Physique');
  const classeMatieres = await prisma.classeMatiere.findMany({
    where: { idClasse: clMathPhys.id },
    include: { matiere: true },
  });

  const computedBulletins: {
    inscriptionId: string;
    totalObtenu: number;
    totalMaximum: number;
    pourcentage: number;
    rang?: number;
  }[] = [];

  for (const ins of inscriptions4eme) {
    let totalObtenu = 0;
    let totalMaximum = 0;

    for (const cm of classeMatieres) {
      const affectation = affectationsMap.get(`4ème Math-Physique_${cm.matiere.libelle}`);
      if (!affectation) continue;

      // Note de la période 1 pour cette matière
      const evals = await prisma.evaluation.findMany({
        where: { idAffectation: affectation.id, idPeriode: p1.id, statut: StatutEvaluation.VALIDEE },
      });
      if (evals.length === 0) continue;

      const evalIds = evals.map((e) => e.id);
      const notes = await prisma.note.findMany({
        where: { idEvaluation: { in: evalIds }, idInscription: ins.id, estValide: true },
      });
      const noteMap = new Map(notes.map((n) => [n.idEvaluation, n]));

      let sumWeighted = 0;
      let sumWeights = 0;
      for (const ev of evals) {
        const n = noteMap.get(ev.id);
        if (!n) continue;
        const on20 = (Number(n.valeurNote) / Number(ev.maximum)) * 20;
        const w = Number(ev.ponderation);
        sumWeighted += on20 * w;
        sumWeights += w;
      }

      const noteMatiere = sumWeights === 0 ? 0 : round2(sumWeighted / sumWeights);
      const coefficient = Number(cm.coefficient);
      const noteBulletin = round2(noteMatiere * coefficient);

      totalObtenu += noteBulletin;
      totalMaximum += coefficient * 20;
    }

    const pourcentage = totalMaximum === 0 ? 0 : round2((totalObtenu / totalMaximum) * 100);
    computedBulletins.push({
      inscriptionId: ins.id,
      totalObtenu: round2(totalObtenu),
      totalMaximum,
      pourcentage,
    });
  }

  // Trier par pourcentage décroissant pour attribuer les rangs
  computedBulletins.sort((a, b) => b.pourcentage - a.pourcentage);
  computedBulletins.forEach((c, idx) => {
    c.rang = idx + 1;
  });

  // Enregistrer les bulletins dans la base
  for (const c of computedBulletins) {
    await prisma.bulletin.create({
      data: {
        type: TypeBulletin.SEMESTRE,
        totalObtenu: new Prisma.Decimal(c.totalObtenu),
        totalMaximum: new Prisma.Decimal(c.totalMaximum),
        pourcentage: new Prisma.Decimal(c.pourcentage),
        rang: c.rang,
        decision: c.pourcentage >= 50 ? 'Réussi' : 'Non réussi',
        idInscription: c.inscriptionId,
        idSemestre: semestre1.id,
        idAnnee: annee.id,
      },
    });
  }

  console.log('====================================================');
  console.log('✅ SEEDING TERMINÉ AVEC SUCCÈS !');
  console.log('====================================================');
  console.log('Résumé des données créées :');
  console.log(`- Compte Admin : ${adminEmail} / MALANDA100`);
  console.log(`- Enseignants  : 5 comptes créés (mdp: prof)`);
  console.log(`- Élèves       : 7 élèves créés et inscrits (mdp: student)`);
  console.log(`- Année        : 2026–2027 (Active)`);
  console.log(`- Classes      : 12 classes créées (1ère à 4ème)`);
  console.log(`- Évaluations  : Période 1 (4ème Math-Physique) entièrement notée`);
  console.log(`- Bulletins    : Calculés et classés pour le Semestre 1`);
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

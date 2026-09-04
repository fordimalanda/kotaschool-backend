import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatutEvaluation, TypeBulletin } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { SaveNotesDto } from './dto/save-notes.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

type SemestreBulletinData = {
  inscriptionId: string;
  semestreId: string;
  lignes: { 
    matiere: string; 
    coefficient: number; 
    note: number; 
    noteBulletin: number;
    p1?: number;
    p2?: number;
    examen?: number;
  }[];
  totalObtenu: number;
  totalMaximum: number;
  pourcentage: number;
  anneeId: string;
  rang?: number;
};

type AnnualBulletinLigne = {
  matiere: string;
  coefficient: number;
  p1?: number;
  p2?: number;
  examS1?: number;
  noteS1: number;
  pointsS1: number;
  maxS1: number;
  p3?: number;
  p4?: number;
  examS2?: number;
  noteS2: number;
  pointsS2: number;
  maxS2: number;
  totalAnnuel: number;
  maxAnnuel: number;
  pourcentage: number;
};

type AnnualBulletinData = {
  inscriptionId: string;
  anneeId: string;
  totalObtenu: number;
  totalMaximum: number;
  pourcentage: number;
  rang?: number;
  totalEleves: number;
  mention: string;
  decision: string;
  application: string;
  conduite: string;
  lignes: AnnualBulletinLigne[];
};

const EVALUATION_INCLUDE: Prisma.EvaluationInclude = {
  affectation: {
    include: {
      annee: true,
      enseignant: { select: { nom: true, prenom: true } },
      classeMatiere: { include: { classe: true, matiere: true } },
    },
  },
  periode: true,
  semestre: { include: { annee: true } },
  typeEvaluation: true,
};

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------
  // Enseignant : contexte, évaluations, grille, saisie
  // ------------------------------------------------------------------

  async teacherContext(userId: string) {
    const user = await this.requireTeacher(userId);
    const [assignments, semestres, typesEvaluation, evaluations] = await Promise.all([
      this.prisma.affectation.findMany({
        where: { idEnseignant: user.enseignantId },
        include: { annee: true, classeMatiere: { include: { classe: true, matiere: true } } },
        orderBy: { annee: { libelle: 'desc' } },
      }),
      this.prisma.semestre.findMany({
        include: { annee: true, periodes: { orderBy: { libelle: 'asc' } } },
        orderBy: { libelle: 'asc' },
      }),
      this.prisma.typeEvaluation.findMany({ orderBy: { libelle: 'asc' } }),
      this.prisma.evaluation.findMany({
        where: { affectation: { idEnseignant: user.enseignantId } },
        include: {
          affectation: { include: { annee: true, enseignant: { select: { nom: true, prenom: true } }, classeMatiere: { include: { classe: true, matiere: true } } } },
          periode: true,
          semestre: { include: { annee: true } },
          typeEvaluation: true,
        },
        orderBy: { dateEvaluation: 'desc' },
      }),
    ]);
    return { assignments, semestres, typesEvaluation, evaluations };
  }

  async createEvaluation(dto: CreateEvaluationDto, userId: string) {
    const user = await this.requireTeacher(userId);
    const affectation = await this.prisma.affectation.findUnique({ where: { id: dto.idAffectation } });
    if (!affectation) throw new NotFoundException('Affectation introuvable');
    if (affectation.idEnseignant !== user.enseignantId) throw new ForbiddenException('Cette affectation ne vous appartient pas');
    return this.prisma.evaluation.create({
      data: {
        libelle: dto.libelle,
        idAffectation: dto.idAffectation,
        idSemestre: dto.idSemestre,
        idPeriode: dto.idPeriode ?? null,
        idTypeEvaluation: dto.idTypeEvaluation,
        maximum: new Prisma.Decimal(dto.maximum ?? 20),
        ponderation: new Prisma.Decimal(dto.ponderation ?? 1),
        dateEvaluation: new Date(dto.dateEvaluation),
      },
    });
  }

  async grille(idEvaluation: string, userId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: idEvaluation },
      include: {
        affectation: {
          include: {
            annee: true,
            classeMatiere: { include: { classe: { include: { inscriptions: { include: { eleve: true } } } }, matiere: true } },
          },
        },
        periode: true,
        semestre: true,
        typeEvaluation: true,
        notes: true,
      },
    });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (user?.enseignantId && evaluation.affectation.idEnseignant !== user.enseignantId) throw new ForbiddenException('Accès refusé');

    const inscriptions = evaluation.affectation.classeMatiere.classe.inscriptions.filter((i) => i.idAnnee === evaluation.affectation.idAnnee);
    const noteByInscription = new Map(evaluation.notes.map((n) => [n.idInscription, n]));

    return {
      evaluation: {
        id: evaluation.id,
        libelle: evaluation.libelle,
        maximum: Number(evaluation.maximum),
        statut: evaluation.statut,
        semestre: evaluation.semestre.libelle,
        periode: evaluation.periode?.libelle ?? null,
        typeEvaluation: evaluation.typeEvaluation.libelle,
        matiere: evaluation.affectation.classeMatiere.matiere.libelle,
        classe: evaluation.affectation.classeMatiere.classe.libelle,
        annee: evaluation.affectation.annee.libelle,
      },
      rows: inscriptions.map((i) => {
        const note = noteByInscription.get(i.id);
        return {
          idInscription: i.id,
          matricule: i.eleve.matricule,
          nom: i.eleve.nom,
          postnom: i.eleve.postnom,
          prenom: i.eleve.prenom,
          valeurNote: note ? Number(note.valeurNote) : null,
          observation: note?.observation ?? '',
          estValide: note?.estValide ?? false,
        };
      }),
    };
  }

  async saveNotesBatch(dto: SaveNotesDto, userId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({ where: { id: dto.idEvaluation }, include: { affectation: true } });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user?.enseignantId || evaluation.affectation.idEnseignant !== user.enseignantId) throw new ForbiddenException('Accès refusé');

    const isValidee = evaluation.statut === StatutEvaluation.VALIDEE;
    const max = Number(evaluation.maximum);
    const clamped = (v: number) => new Prisma.Decimal(Math.max(0, Math.min(max, Math.round(v * 100) / 100)));

    // Une cellule vidée (valeurNote absente) efface la note existante ; les autres sont insérées/mises à jour.
    const toSave = dto.notes.filter((n) => n.valeurNote !== undefined && n.valeurNote !== null);
    const toClear = dto.notes.filter((n) => n.valeurNote === undefined || n.valeurNote === null).map((n) => n.idInscription);

    const operations = [
      ...(toClear.length > 0
        ? [this.prisma.note.deleteMany({ where: { idEvaluation: dto.idEvaluation, idInscription: { in: toClear } } })]
        : []),
      ...toSave.map((n) =>
        this.prisma.note.upsert({
          where: { idInscription_idEvaluation: { idInscription: n.idInscription, idEvaluation: dto.idEvaluation } },
          update: {
            valeurNote: clamped(n.valeurNote!),
            observation: n.observation?.trim() || null,
            ...(isValidee ? { estValide: true, valideParId: user.id, dateValidation: new Date() } : {}),
          },
          create: {
            idInscription: n.idInscription,
            idEvaluation: dto.idEvaluation,
            valeurNote: clamped(n.valeurNote!),
            observation: n.observation?.trim() || null,
            estValide: isValidee,
            ...(isValidee ? { valideParId: user.id, dateValidation: new Date() } : {}),
          },
        }),
      ),
    ];
    const res = await this.prisma.$transaction(operations);

    // Si l'évaluation était déjà validée, mettre à jour automatiquement les bulletins semestriels et annuels
    if (isValidee) {
      setImmediate(async () => {
        try {
          await this.recalculateSemestre(evaluation.idSemestre);
          await this.recalculateAnnuel(evaluation.affectation.idAnnee);
        } catch (err) {
          console.error('Erreur recalcul bulletins:', err);
        }
      });
    }

    return res;
  }

  async submitEvaluation(id: string, userId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({ where: { id }, include: { affectation: true } });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } });
    if (!user?.enseignantId || evaluation.affectation.idEnseignant !== user.enseignantId) throw new ForbiddenException('Accès refusé');
    if (evaluation.statut !== StatutEvaluation.BROUILLON) throw new BadRequestException('Seule une évaluation en brouillon peut être soumise');
    const count = await this.prisma.note.count({ where: { idEvaluation: id } });
    if (count === 0) throw new BadRequestException('Aucune note saisie à soumettre');
    return this.prisma.evaluation.update({ where: { id }, data: { statut: StatutEvaluation.SOUMISE } });
  }

  // ------------------------------------------------------------------
  // Admin : validation officielle des évaluations soumises
  // ------------------------------------------------------------------

  async pendingValidations() {
    return this.prisma.evaluation.findMany({
      where: { statut: StatutEvaluation.SOUMISE },
      include: {
        affectation: { include: { annee: true, enseignant: { select: { nom: true, prenom: true } }, classeMatiere: { include: { classe: true, matiere: true } } } },
        periode: true,
        semestre: { include: { annee: true } },
        typeEvaluation: true,
      },
      orderBy: { dateEvaluation: 'asc' },
    });
  }

  async validateEvaluation(id: string, userId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({ where: { id } });
    if (!evaluation) throw new NotFoundException('Évaluation introuvable');
    if (evaluation.statut !== StatutEvaluation.SOUMISE) throw new BadRequestException('Seule une évaluation soumise peut être validée');
    const [, updated] = await this.prisma.$transaction([
      this.prisma.note.updateMany({ where: { idEvaluation: id }, data: { estValide: true, valideParId: userId, dateValidation: new Date() } }),
      this.prisma.evaluation.update({ where: { id }, data: { statut: StatutEvaluation.VALIDEE } }),
    ]);
    return updated;
  }

  // ------------------------------------------------------------------
  // Calcul des moyennes (module GradesService)
  // ------------------------------------------------------------------

  /** Moyenne d'une période sur 20 : moyenne pondérée des évaluations validées (TP/Interrogations). */
  async computePeriodeNote(affectationId: string, periodeId: string, inscriptionId: string): Promise<number> {
    const evaluations = await this.prisma.evaluation.findMany({
      where: { idAffectation: affectationId, idPeriode: periodeId, statut: StatutEvaluation.VALIDEE },
      select: { id: true, maximum: true, ponderation: true },
    });
    if (evaluations.length === 0) return 0;
    const notes = await this.prisma.note.findMany({
      where: { idEvaluation: { in: evaluations.map((e) => e.id) }, idInscription: inscriptionId, estValide: true },
    });
    const noteByEval = new Map(notes.map((n) => [n.idEvaluation, n]));

    let sumWeighted = 0;
    let sumWeights = 0;
    for (const ev of evaluations) {
      const note = noteByEval.get(ev.id);
      if (!note) continue;
      const on20 = (Number(note.valeurNote) / Number(ev.maximum)) * 20;
      const w = Number(ev.ponderation);
      sumWeighted += on20 * w;
      sumWeights += w;
    }
    return sumWeights === 0 ? 0 : round2(sumWeighted / sumWeights);
  }

  /** Note de semestre sur 20 : moyenne des périodes réellement évaluées ; les examens comptent double. */
  async computeSemestreNote(affectationId: string, semestreId: string, inscriptionId: string): Promise<number> {
    const periodes = await this.prisma.periode.findMany({ where: { idSemestre: semestreId }, orderBy: { libelle: 'asc' } });

    // On ne retient que les périodes ayant au moins une évaluation validée pour cette affectation,
    // afin qu'une période non encore évaluée ne fasse pas chuter artificiellement la moyenne.
    const evaluatedPeriodes = await this.prisma.evaluation.findMany({
      where: { idAffectation: affectationId, idSemestre: semestreId, idPeriode: { not: null }, statut: StatutEvaluation.VALIDEE },
      select: { idPeriode: true },
    });
    const gradedPeriodeIds = new Set(evaluatedPeriodes.map((e) => e.idPeriode as string));

    let sum = 0;
    let weight = 0;
    for (const p of periodes) {
      if (!gradedPeriodeIds.has(p.id)) continue;
      sum += await this.computePeriodeNote(affectationId, p.id, inscriptionId);
      weight += 1;
    }

    const exams = await this.prisma.evaluation.findMany({
      where: { idAffectation: affectationId, idSemestre: semestreId, idPeriode: null, statut: StatutEvaluation.VALIDEE },
      select: { id: true, maximum: true },
    });
    if (exams.length > 0) {
      const examNotes = await this.prisma.note.findMany({
        where: { idEvaluation: { in: exams.map((e) => e.id) }, idInscription: inscriptionId, estValide: true },
      });
      const noteByEval = new Map(examNotes.map((n) => [n.idEvaluation, n]));
      for (const ev of exams) {
        const note = noteByEval.get(ev.id);
        if (!note) continue;
        const on20 = (Number(note.valeurNote) / Number(ev.maximum)) * 20;
        sum += on20 * 2; // l'examen compte pour le double d'une période
        weight += 2;
      }
    }

    return weight === 0 ? 0 : round2(sum / weight);
  }

  /** Détail du bulletin d'un élève : note_bulletin = note_matière × coefficient. */
  async computeSemestreBulletin(semestreId: string, inscriptionId: string): Promise<SemestreBulletinData> {
    const [inscription, semestre, periodes] = await Promise.all([
      this.prisma.inscription.findUnique({
        where: { id: inscriptionId },
        include: { classe: { include: { classeMatieres: { include: { matiere: true } } } } },
      }),
      this.prisma.semestre.findUnique({ where: { id: semestreId } }),
      this.prisma.periode.findMany({ where: { idSemestre: semestreId }, orderBy: { libelle: 'asc' } }),
    ]);
    if (!inscription || !semestre) throw new NotFoundException('Inscription ou semestre introuvable');

    let totalObtenu = 0;
    let totalMaximum = 0;
    const lignes: SemestreBulletinData['lignes'] = [];

    for (const cm of inscription.classe.classeMatieres) {
      const affectation = await this.prisma.affectation.findFirst({ where: { idClasseMatiere: cm.id, idAnnee: inscription.idAnnee } });
      if (!affectation) continue;
      const note = await this.computeSemestreNote(affectation.id, semestreId, inscriptionId);
      const coefficient = Number(cm.coefficient);
      const noteBulletin = round2(note * coefficient);
      totalObtenu += noteBulletin;
      totalMaximum += coefficient * 20;

      let p1 = 0;
      let p2 = 0;
      if (periodes[0]) {
        p1 = await this.computePeriodeNote(affectation.id, periodes[0].id, inscriptionId);
      }
      if (periodes[1]) {
        p2 = await this.computePeriodeNote(affectation.id, periodes[1].id, inscriptionId);
      }

      const examEval = await this.prisma.evaluation.findFirst({
        where: { idAffectation: affectation.id, idSemestre: semestreId, idPeriode: null, statut: StatutEvaluation.VALIDEE },
      });
      let examen = 0;
      if (examEval) {
        const noteDb = await this.prisma.note.findUnique({
          where: { idInscription_idEvaluation: { idInscription: inscriptionId, idEvaluation: examEval.id } },
        });
        if (noteDb && noteDb.estValide) {
          examen = round2((Number(noteDb.valeurNote) / Number(examEval.maximum)) * 20);
        }
      }

      lignes.push({ matiere: cm.matiere.libelle, coefficient, note, noteBulletin, p1, p2, examen });
    }

    const pourcentage = totalMaximum === 0 ? 0 : round2((totalObtenu / totalMaximum) * 100);
    return { inscriptionId, semestreId, lignes, totalObtenu: round2(totalObtenu), totalMaximum, pourcentage, anneeId: inscription.idAnnee };
  }

  /** Recalcule les bulletins semestriels de tout un semestre, avec classement (rang). */
  async recalculateSemestre(semestreId: string) {
    const semestre = await this.prisma.semestre.findUnique({
      where: { id: semestreId },
      include: { annee: { include: { inscriptions: true } } },
    });
    if (!semestre) throw new NotFoundException('Semestre introuvable');

    const computed: { inscriptionId: string; pourcentage: number; data: SemestreBulletinData }[] = [];
    for (const ins of semestre.annee.inscriptions) {
      const data = await this.computeSemestreBulletin(semestreId, ins.id);
      computed.push({ inscriptionId: ins.id, pourcentage: data.pourcentage, data });
    }
    computed.sort((a, b) => b.pourcentage - a.pourcentage);
    computed.forEach((c, idx) => (c.data.rang = idx + 1));

    await this.prisma.bulletin.deleteMany({ where: { idSemestre: semestreId, type: TypeBulletin.SEMESTRE } });
    return this.prisma.$transaction(
      computed.map((c) =>
        this.prisma.bulletin.create({
          data: {
            type: TypeBulletin.SEMESTRE,
            totalObtenu: new Prisma.Decimal(c.data.totalObtenu),
            totalMaximum: new Prisma.Decimal(c.data.totalMaximum),
            pourcentage: new Prisma.Decimal(c.data.pourcentage),
            rang: c.data.rang,
            decision: c.data.pourcentage >= 50 ? 'Réussi' : 'Non réussi',
            idInscription: c.inscriptionId,
            idSemestre: semestreId,
            idAnnee: c.data.anneeId,
          },
        }),
      ),
    );
  }

  async bulletinsOfInscription(inscriptionId: string) {
    return this.prisma.bulletin.findMany({
      where: { idInscription: inscriptionId },
      include: { semestre: true },
      orderBy: { idSemestre: 'asc' },
    });
  }

  // ------------------------------------------------------------------
  // Bulletins / Rapports (consultation admin)
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Élève : consultation de ses propres résultats
  // ------------------------------------------------------------------

  async myGrades(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId }, include: { eleve: true } });
    if (!user?.eleve) throw new ForbiddenException('Aucun élève associé à ce compte');

    const inscription = await this.prisma.inscription.findFirst({
      where: { matricule: user.eleve.matricule },
      include: { annee: true, classe: { include: { option: { include: { section: true } } } } },
      orderBy: { annee: { libelle: 'desc' } },
    });
    if (!inscription) throw new NotFoundException('Aucune inscription trouvée pour cet élève.');

    const [semestres, notes, bulletins] = await Promise.all([
      this.prisma.semestre.findMany({ where: { idAnnee: inscription.idAnnee }, include: { periodes: { orderBy: { libelle: 'asc' } } }, orderBy: { libelle: 'asc' } }),
      this.prisma.note.findMany({
        where: { idInscription: inscription.id },
        include: { evaluation: { include: { typeEvaluation: true, periode: true, semestre: true, affectation: { include: { classeMatiere: { include: { matiere: true } } } } } } },
        orderBy: { evaluation: { dateEvaluation: 'desc' } },
      }),
      this.prisma.bulletin.findMany({ where: { idInscription: inscription.id, type: TypeBulletin.SEMESTRE } }),
    ]);

    const bulletinBySem = new Map(bulletins.map((b) => [b.idSemestre, b]));
    const semestersView = [];
    for (const s of semestres) {
      const resultats = notes
        .filter((n) => n.evaluation.idSemestre === s.id)
        .map((n) => ({
          libelle: n.evaluation.libelle,
          type: n.evaluation.typeEvaluation.libelle,
          periode: n.evaluation.periode?.libelle ?? 'Examen',
          matiere: n.evaluation.affectation.classeMatiere.matiere.libelle,
          note: Number(n.valeurNote),
          maximum: Number(n.evaluation.maximum),
          statut: n.evaluation.statut,
          estValide: n.estValide,
        }));
      const bul = bulletinBySem.get(s.id);
      let lignes: SemestreBulletinData['lignes'] = [];
      if (bul) {
        try {
          lignes = (await this.computeSemestreBulletin(s.id, inscription.id)).lignes;
        } catch {
          lignes = [];
        }
      }
      semestersView.push({
        id: s.id,
        libelle: s.libelle,
        resultats,
        bulletin: bul ? { totalObtenu: Number(bul.totalObtenu), totalMaximum: Number(bul.totalMaximum), pourcentage: Number(bul.pourcentage), rang: bul.rang, decision: bul.decision, lignes } : null,
      });
    }

    return {
      eleve: { matricule: user.eleve.matricule, nom: user.eleve.nom, postnom: user.eleve.postnom, prenom: user.eleve.prenom },
      classe: inscription.classe.libelle,
      option: inscription.classe.option.libelle,
      section: inscription.classe.option.section.libelle,
      annee: inscription.annee.libelle,
      semestres: semestersView,
    };
  }

  async reportSemestres() {
    return this.prisma.semestre.findMany({ include: { annee: true }, orderBy: { libelle: 'asc' } });
  }

  /** Tableau de bord du semestre : classement complet de la cohorte. */
  async classBulletinBoard(semestreId: string) {
    const semestre = await this.prisma.semestre.findUnique({ where: { id: semestreId }, include: { annee: true } });
    if (!semestre) throw new NotFoundException('Semestre introuvable');
    const bulletins = await this.prisma.bulletin.findMany({
      where: { idSemestre: semestreId, type: TypeBulletin.SEMESTRE },
      include: { inscription: { include: { eleve: true, classe: true } } },
      orderBy: [{ rang: 'asc' }, { pourcentage: 'desc' }],
    });
    return {
      semestre: { id: semestre.id, libelle: semestre.libelle, annee: semestre.annee.libelle },
      bulletins: bulletins.map((b) => ({
        inscriptionId: b.idInscription,
        matricule: b.inscription.eleve.matricule,
        nom: `${b.inscription.eleve.nom} ${b.inscription.eleve.postnom ?? ''} ${b.inscription.eleve.prenom}`.trim(),
        classe: b.inscription.classe.libelle,
        totalObtenu: Number(b.totalObtenu),
        totalMaximum: Number(b.totalMaximum),
        pourcentage: Number(b.pourcentage),
        rang: b.rang,
        decision: b.decision,
      })),
    };
  }

  /** Bulletin détaillé d'un élève pour un semestre (matières, notes, coefficients). */
  async inscriptionBulletinDetail(inscriptionId: string, semestreId: string) {
    const [data, inscription, semestre, stored] = await Promise.all([
      this.computeSemestreBulletin(semestreId, inscriptionId),
      this.prisma.inscription.findUnique({ where: { id: inscriptionId }, include: { eleve: true, classe: { include: { option: { include: { section: true } } } }, annee: true } }),
      this.prisma.semestre.findUnique({ where: { id: semestreId }, include: { annee: true } }),
      this.prisma.bulletin.findFirst({ where: { idInscription: inscriptionId, idSemestre: semestreId, type: TypeBulletin.SEMESTRE } }),
    ]);
    if (!inscription || !semestre) throw new NotFoundException('Inscription ou semestre introuvable');

    return {
      semestre: { libelle: semestre.libelle, annee: semestre.annee.libelle },
      eleve: {
        matricule: inscription.eleve.matricule,
        nom: inscription.eleve.nom,
        postnom: inscription.eleve.postnom,
        prenom: inscription.eleve.prenom,
        classe: inscription.classe.libelle,
        option: inscription.classe.option.libelle,
        section: inscription.classe.option.section.libelle,
      },
      lignes: data.lignes,
      totalObtenu: data.totalObtenu,
      totalMaximum: data.totalMaximum,
      pourcentage: data.pourcentage,
      rang: stored?.rang ?? null,
      decision: stored?.decision ?? null,
    };
  }

  // ------------------------------------------------------------------
  // Bulletin annuel (combinaison S1 + S2 — réalité congolaise)
  // ------------------------------------------------------------------

  /**
   * Calcule le bulletin annuel d'un élève en combinant S1 et S2.
   * Règles système EPSP / Congo :
   *  - Note annuelle par matière = (noteS1 + noteS2) / 2  (arrondie à 2 décimales)
   *  - Pourcentage annuel = totalObtenu / totalMaximum * 100
   *  - Mention / Degré de satisfaction selon les seuils de l'EPSP :
   *      >= 80%  → Grande Distinction
   *      >= 70%  → Distinction
   *      >= 60%  → Satisfaction
   *      >= 50%  → Réussi
   *      < 50%   → Non réussi (Échec)
   *  - Decision de passage :
   *      >= 50%  → Passe en classe supérieure
   *      < 50%   → Double (redouble)
   *  - Application & conduite (fix seeded, non géré en DB pour l'instant)
   */
  async computeAnnualBulletin(anneeId: string, inscriptionId: string): Promise<AnnualBulletinData> {
    const [inscription, semestres] = await Promise.all([
      this.prisma.inscription.findUnique({
        where: { id: inscriptionId },
        include: { classe: { include: { classeMatieres: { include: { matiere: true } } } } },
      }),
      this.prisma.semestre.findMany({ where: { idAnnee: anneeId }, orderBy: { libelle: 'asc' } }),
    ]);
    if (!inscription) throw new NotFoundException('Inscription introuvable');
    if (semestres.length < 2) throw new BadRequestException('Il faut au moins deux semestres pour calculer le bulletin annuel');

    const [s1, s2] = semestres;
    const [bulS1, bulS2] = await Promise.all([
      this.computeSemestreBulletin(s1.id, inscriptionId),
      this.computeSemestreBulletin(s2.id, inscriptionId),
    ]);

    // Fusionner les lignes par matière
    const matiereMap = new Map<string, { coef: number; ptS1: number; maxS1: number; ptS2: number; maxS2: number }>();
    for (const l of bulS1.lignes) {
      matiereMap.set(l.matiere, { coef: l.coefficient, ptS1: l.noteBulletin, maxS1: l.coefficient * 20, ptS2: 0, maxS2: l.coefficient * 20 });
    }
    for (const l of bulS2.lignes) {
      const existing = matiereMap.get(l.matiere);
      if (existing) {
        existing.ptS2 = l.noteBulletin;
        existing.maxS2 = l.coefficient * 20;
      } else {
        matiereMap.set(l.matiere, { coef: l.coefficient, ptS1: 0, maxS1: l.coefficient * 20, ptS2: l.noteBulletin, maxS2: l.coefficient * 20 });
      }
    }

    let totalObtenu = 0;
    let totalMaximum = 0;
    const lignes: AnnualBulletinLigne[] = [];

    for (const [matiere, d] of matiereMap.entries()) {
      const totalAnnuel = round2(d.ptS1 + d.ptS2);
      const maxAnnuel = d.maxS1 + d.maxS2;
      const pourcentage = maxAnnuel === 0 ? 0 : round2((totalAnnuel / maxAnnuel) * 100);
      const noteS1 = d.coef === 0 ? 0 : round2(d.ptS1 / d.coef);
      const noteS2 = d.coef === 0 ? 0 : round2(d.ptS2 / d.coef);
      totalObtenu += totalAnnuel;
      totalMaximum += maxAnnuel;
      const l1 = bulS1.lignes.find((l) => l.matiere === matiere);
      const l2 = bulS2.lignes.find((l) => l.matiere === matiere);

      lignes.push({
        matiere,
        coefficient: d.coef,
        p1: l1?.p1 ?? 0,
        p2: l1?.p2 ?? 0,
        examS1: l1?.examen ?? 0,
        noteS1,
        pointsS1: d.ptS1,
        maxS1: d.maxS1,
        p3: l2?.p1 ?? 0,
        p4: l2?.p2 ?? 0,
        examS2: l2?.examen ?? 0,
        noteS2,
        pointsS2: d.ptS2,
        maxS2: d.maxS2,
        totalAnnuel,
        maxAnnuel,
        pourcentage,
      });
    }

    const pourcentage = totalMaximum === 0 ? 0 : round2((totalObtenu / totalMaximum) * 100);

    // Mention EPSP Congo
    let mention: string;
    let decision: string;
    if (pourcentage >= 80) { mention = 'Grande Distinction'; decision = 'Passe en classe supérieure'; }
    else if (pourcentage >= 70) { mention = 'Distinction'; decision = 'Passe en classe supérieure'; }
    else if (pourcentage >= 60) { mention = 'Satisfaction'; decision = 'Passe en classe supérieure'; }
    else if (pourcentage >= 50) { mention = 'Réussi'; decision = 'Passe en classe supérieure'; }
    else { mention = 'Non réussi'; decision = 'Double (redouble)'; }

    return {
      inscriptionId,
      anneeId,
      totalObtenu: round2(totalObtenu),
      totalMaximum,
      pourcentage,
      mention,
      decision,
      application: 'Bonne',
      conduite: 'Bonne',
      totalEleves: 0, // sera rempli lors du recalcul global
      lignes,
    };
  }

  /** Recalcule et stocke les bulletins annuels de toute une année, avec rang. */
  async recalculateAnnuel(anneeId: string) {
    const semestres = await this.prisma.semestre.findMany({
      where: { idAnnee: anneeId },
      orderBy: { libelle: 'asc' },
    });
    if (semestres.length < 2) return;

    const [s1, s2] = semestres;
    const [bulS1, bulS2] = await Promise.all([
      this.prisma.bulletin.findMany({ where: { idSemestre: s1.id, type: TypeBulletin.SEMESTRE } }),
      this.prisma.bulletin.findMany({ where: { idSemestre: s2.id, type: TypeBulletin.SEMESTRE } }),
    ]);

    const mapS1 = new Map(bulS1.map((b) => [b.idInscription, b]));
    const mapS2 = new Map(bulS2.map((b) => [b.idInscription, b]));

    const computed: { inscriptionId: string; totalObtenu: number; totalMaximum: number; pourcentage: number; mention: string; rang?: number }[] = [];

    for (const [inscriptionId, b1] of mapS1.entries()) {
      const b2 = mapS2.get(inscriptionId);
      if (!b2) continue;

      const totalObtenu = round2(Number(b1.totalObtenu) + Number(b2.totalObtenu));
      const totalMaximum = Number(b1.totalMaximum) + Number(b2.totalMaximum);
      const pourcentage = totalMaximum === 0 ? 0 : round2((totalObtenu / totalMaximum) * 100);

      let mention: string;
      if (pourcentage >= 80) mention = 'Grande Distinction';
      else if (pourcentage >= 70) mention = 'Distinction';
      else if (pourcentage >= 60) mention = 'Satisfaction';
      else if (pourcentage >= 50) mention = 'Réussi';
      else mention = 'Non réussi';

      computed.push({ inscriptionId, totalObtenu, totalMaximum, pourcentage, mention });
    }

    computed.sort((a, b) => b.pourcentage - a.pourcentage);
    computed.forEach((c, idx) => {
      c.rang = idx + 1;
    });

    await this.prisma.bulletin.deleteMany({ where: { idAnnee: anneeId, type: TypeBulletin.ANNUEL } });
    if (computed.length > 0) {
      return this.prisma.bulletin.createMany({
        data: computed.map((c) => ({
          type: TypeBulletin.ANNUEL,
          totalObtenu: new Prisma.Decimal(c.totalObtenu),
          totalMaximum: new Prisma.Decimal(c.totalMaximum),
          pourcentage: new Prisma.Decimal(c.pourcentage),
          rang: c.rang,
          decision: c.mention,
          idInscription: c.inscriptionId,
          idSemestre: null,
          idAnnee: anneeId,
        })),
      });
    }
  }

  /** Bulletin annuel de l'élève connecté. */
  async myAnnualBulletin(userId: string) {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId }, include: { eleve: true } });
    if (!user?.eleve) throw new ForbiddenException('Aucun élève associé à ce compte');

    const inscription = await this.prisma.inscription.findFirst({
      where: { matricule: user.eleve.matricule },
      include: { annee: true, classe: { include: { option: { include: { section: true } } } } },
      orderBy: { annee: { libelle: 'desc' } },
    });
    if (!inscription) throw new NotFoundException('Aucune inscription trouvée pour cet élève.');

    const baseInfo = {
      eleve: { matricule: user.eleve.matricule, nom: user.eleve.nom, postnom: user.eleve.postnom, prenom: user.eleve.prenom },
      classe: inscription.classe.libelle,
      option: inscription.classe.option.libelle,
      section: inscription.classe.option.section.libelle,
      annee: inscription.annee.libelle,
    };

    // Récupérer les semestres de l'année
    const semestres = await this.prisma.semestre.findMany({
      where: { idAnnee: inscription.idAnnee },
      orderBy: { libelle: 'asc' },
    });

    if (semestres.length < 2) {
      return { ...baseInfo, bulletin: null, published: false, readyForAnnual: false, missingInfo: 'Il faut au moins deux semestres configurés pour générer le bulletin annuel.' };
    }

    // Vérifier que toutes les notes de chaque matière existent et sont validées pour les deux semestres
    // On vérifie que pour chaque affectation de la classe, il existe au moins une note validée dans chaque semestre
    const classeMatieres = await this.prisma.classeMatiere.findMany({
      where: { idClasse: inscription.idClasse },
      include: { matiere: true },
    });

    const missingItems: string[] = [];

    for (const sem of semestres) {
      for (const cm of classeMatieres) {
        const affectation = await this.prisma.affectation.findFirst({
          where: { idClasseMatiere: cm.id, idAnnee: inscription.idAnnee },
        });
        if (!affectation) continue;

        // Vérifier qu'il y a au moins une note validée pour cette matière dans ce semestre
        const notesCount = await this.prisma.note.count({
          where: {
            idInscription: inscription.id,
            estValide: true,
            evaluation: {
              idAffectation: affectation.id,
              idSemestre: sem.id,
              statut: StatutEvaluation.VALIDEE,
            },
          },
        });

        if (notesCount === 0) {
          missingItems.push(`${cm.matiere.libelle} (${sem.libelle})`);
        }
      }
    }

    if (missingItems.length > 0) {
      return {
        ...baseInfo,
        bulletin: null,
        published: false,
        readyForAnnual: false,
        missingInfo: `Des notes manquent encore dans : ${missingItems.slice(0, 5).join(', ')}${missingItems.length > 5 ? ` et ${missingItems.length - 5} autre(s)` : ''}. Le Bulletin Scolaire Annuel sera disponible quand toutes les notes des deux semestres auront été saisies et validées.`,
      };
    }

    const stored = await this.prisma.bulletin.findFirst({
      where: { idInscription: inscription.id, idAnnee: inscription.idAnnee, type: TypeBulletin.ANNUEL },
    });

    const totalEleves = await this.prisma.bulletin.count({
      where: { idAnnee: inscription.idAnnee, type: TypeBulletin.ANNUEL },
    });

    // Calculer en live les lignes combinées
    try {
      const data = await this.computeAnnualBulletin(inscription.idAnnee, inscription.id);
      data.rang = stored?.rang ?? undefined;
      data.totalEleves = totalEleves;
      return {
        ...baseInfo,
        bulletin: data,
        published: !!stored,
        readyForAnnual: true,
        missingInfo: null,
      };
    } catch {
      return {
        ...baseInfo,
        bulletin: null,
        published: false,
        readyForAnnual: false,
        missingInfo: 'Impossible de calculer le bulletin annuel pour le moment.',
      };
    }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private async requireTeacher(userId: string): Promise<{ id: string; enseignantId: string }> {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId }, select: { id: true, enseignantId: true } });
    if (!user) throw new ForbiddenException('Utilisateur introuvable');
    if (!user.enseignantId) throw new ForbiddenException('Aucun enseignant associé à ce compte');
    return { id: user.id, enseignantId: user.enseignantId };
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatutEvaluation, TypeBulletin } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { SaveNotesDto } from './dto/save-notes.dto';

const round2 = (n: number) => Math.round(n * 100) / 100;

type SemestreBulletinData = {
  inscriptionId: string;
  semestreId: string;
  lignes: { matiere: string; coefficient: number; note: number; noteBulletin: number }[];
  totalObtenu: number;
  totalMaximum: number;
  pourcentage: number;
  anneeId: string;
  rang?: number;
};

const EVALUATION_INCLUDE = {
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
} as const;

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
        include: EVALUATION_INCLUDE,
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
    if (evaluation.statut !== StatutEvaluation.BROUILLON) throw new BadRequestException('Seules les évaluations en brouillon peuvent être modifiées');

    const max = Number(evaluation.maximum);
    const clamped = (v: number) => new Prisma.Decimal(Math.max(0, Math.min(max, Math.round(v * 100) / 100)));

    return this.prisma.$transaction(
      dto.notes.map((n) =>
        this.prisma.note.upsert({
          where: { idInscription_idEvaluation: { idInscription: n.idInscription, idEvaluation: dto.idEvaluation } },
          update: { valeurNote: clamped(n.valeurNote), observation: n.observation?.trim() || null },
          create: { idInscription: n.idInscription, idEvaluation: dto.idEvaluation, valeurNote: clamped(n.valeurNote), observation: n.observation?.trim() || null },
        }),
      ),
    );
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
  // Conseil pédagogique / Admin : validation
  // ------------------------------------------------------------------

  async pendingValidations() {
    return this.prisma.evaluation.findMany({
      where: { statut: StatutEvaluation.SOUMISE },
      include: EVALUATION_INCLUDE,
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

  /** Note de semestre sur 20 : moyenne des périodes ; les examens comptent double. */
  async computeSemestreNote(affectationId: string, semestreId: string, inscriptionId: string): Promise<number> {
    const periodes = await this.prisma.periode.findMany({ where: { idSemestre: semestreId }, orderBy: { libelle: 'asc' } });

    let sum = 0;
    let weight = 0;
    for (const p of periodes) {
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
    const [inscription, semestre] = await Promise.all([
      this.prisma.inscription.findUnique({
        where: { id: inscriptionId },
        include: { classe: { include: { classeMatieres: { include: { matiere: true } } } } },
      }),
      this.prisma.semestre.findUnique({ where: { id: semestreId } }),
    ]);
    if (!inscription || !semestre) throw new NotFoundException('Inscription ou semestre introuvable');

    let totalObtenu = 0;
    let totalMaximum = 0;
    const lignes: { matiere: string; coefficient: number; note: number; noteBulletin: number }[] = [];

    for (const cm of inscription.classe.classeMatieres) {
      const affectation = await this.prisma.affectation.findFirst({ where: { idClasseMatiere: cm.id, idAnnee: inscription.idAnnee } });
      if (!affectation) continue;
      const note = await this.computeSemestreNote(affectation.id, semestreId, inscriptionId);
      const coefficient = Number(cm.coefficient);
      const noteBulletin = round2(note * coefficient);
      totalObtenu += noteBulletin;
      totalMaximum += coefficient * 20;
      lignes.push({ matiere: cm.matiere.libelle, coefficient, note, noteBulletin });
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
  // Helpers
  // ------------------------------------------------------------------

  private async requireTeacher(userId: string): Promise<{ id: string; enseignantId: string }> {
    const user = await this.prisma.utilisateur.findUnique({ where: { id: userId }, select: { id: true, enseignantId: true } });
    if (!user) throw new ForbiddenException('Utilisateur introuvable');
    if (!user.enseignantId) throw new ForbiddenException('Aucun enseignant associé à ce compte');
    return { id: user.id, enseignantId: user.enseignantId };
  }
}

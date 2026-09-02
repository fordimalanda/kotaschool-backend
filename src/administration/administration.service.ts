import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdministrationService {
  constructor(private readonly prisma: PrismaService) {}
  catalogue() { return Promise.all([this.prisma.section.findMany({ include: { options: { include: { classes: true } } } }), this.prisma.matiere.findMany(), this.prisma.enseignant.findMany({ where: { estActif: true } }), this.prisma.anneeScolaire.findMany({ orderBy: { libelle: 'desc' } })]).then(([sections, matieres, enseignants, annees]) => ({ sections, matieres, enseignants, annees })); }
  createTeacher(data: any) { return this.prisma.enseignant.create({ data }); }
  createStudent(data: any) { return this.prisma.eleve.create({ data: { ...data, dateNaissance: new Date(data.dateNaissance) } }); }
  createSection(libelle: string) { return this.prisma.section.create({ data: { libelle } }); }
  createOption(data: any) { return this.prisma.option.create({ data }); }
  createClasse(data: any) { return this.prisma.classe.create({ data }); }
  createMatiere(libelle: string) { return this.prisma.matiere.create({ data: { libelle } }); }
  createAnnee(data: { libelle: string; estActive?: boolean }) { return this.prisma.$transaction(async (tx) => { if (data.estActive) await tx.anneeScolaire.updateMany({ data: { estActive: false } }); return tx.anneeScolaire.create({ data }); }); }
  async addClasseMatiere(data: { idClasse: string; idMatiere: string; coefficient: number }) { return this.prisma.classeMatiere.upsert({ where: { idClasse_idMatiere: { idClasse: data.idClasse, idMatiere: data.idMatiere } }, update: { coefficient: data.coefficient }, create: data }); }
  async affecter(data: { idEnseignant: string; idClasseMatiere: string; idAnnee: string }) { return this.prisma.affectation.upsert({ where: { idEnseignant_idClasseMatiere_idAnnee: data }, update: {}, create: data }); }
  async inscrire(data: { matricule: string; idClasse: string; idAnnee: string }) { return this.prisma.inscription.upsert({ where: { matricule_idAnnee: { matricule: data.matricule, idAnnee: data.idAnnee } }, update: { idClasse: data.idClasse }, create: data }); }
  async teacherAssignments(userId: string) { const user = await this.prisma.utilisateur.findUnique({ where: { id: userId } }); if (!user?.enseignantId) throw new NotFoundException('Aucun enseignant associé à ce compte'); return this.prisma.affectation.findMany({ where: { idEnseignant: user.enseignantId }, include: { annee: true, classeMatiere: { include: { classe: true, matiere: true } } } }); }

  // --- Lectures pour les écrans d'administration ---
  async listStudents() {
    return this.prisma.eleve.findMany({
      where: { estActif: true },
      include: { inscriptions: { include: { annee: true, classe: true }, orderBy: { annee: { libelle: 'desc' } } } },
      orderBy: { nom: 'asc' },
    });
  }

  async listAssignments() {
    return this.prisma.affectation.findMany({
      include: {
        enseignant: { select: { nom: true, postnom: true, prenom: true } },
        annee: true,
        classeMatiere: { include: { classe: { include: { option: { include: { section: true } } } }, matiere: true } },
      },
      orderBy: { annee: { libelle: 'desc' } },
    });
  }

  async listClassSubjects() {
    return this.prisma.classeMatiere.findMany({
      include: { classe: { include: { option: { include: { section: true } } } }, matiere: true },
      orderBy: [{ classe: { libelle: 'asc' } }, { matiere: { libelle: 'asc' } }],
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CodeRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_PASSWORD: Record<CodeRole, string> = { ADMIN: 'admin', TEACHER: 'prof', SECRETARY: 'secretary', PEDAGOGICAL_COUNCIL: 'council', STUDENT: 'student' };

@Injectable()
export class AdministrationService {
  constructor(private readonly prisma: PrismaService) {}
  catalogue() { return Promise.all([this.prisma.section.findMany({ include: { options: { include: { classes: true } } } }), this.prisma.matiere.findMany(), this.prisma.enseignant.findMany({ where: { estActif: true } }), this.prisma.anneeScolaire.findMany({ orderBy: { libelle: 'desc' } })]).then(([sections, matieres, enseignants, annees]) => ({ sections, matieres, enseignants, annees })); }
  async createTeacher(data: { nom: string; postnom?: string; prenom: string; sexe: 'M' | 'F'; telephone?: string; email?: string; motDePasse?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const enseignant = await tx.enseignant.create({ data: { nom: data.nom, postnom: data.postnom, prenom: data.prenom, sexe: data.sexe, telephone: data.telephone, email: data.email } });
      // Compte de connexion : mot de passe par défaut 'prof' si non renseigné.
      if (data.email) await this.createUserWithRole(tx, { email: data.email, motDePasse: data.motDePasse, role: CodeRole.TEACHER, enseignantId: enseignant.id });
      return enseignant;
    });
  }

  async createStudent(data: { matricule: string; nom: string; postnom?: string; prenom: string; sexe: 'M' | 'F'; dateNaissance: string; lieuNaissance?: string; adresse?: string; email?: string; motDePasse?: string }) {
    return this.prisma.$transaction(async (tx) => {
      const eleve = await tx.eleve.create({ data: { matricule: data.matricule, nom: data.nom, postnom: data.postnom, prenom: data.prenom, sexe: data.sexe, dateNaissance: new Date(data.dateNaissance), lieuNaissance: data.lieuNaissance, adresse: data.adresse } });
      // Compte de connexion élève : mot de passe par défaut 'student' si non renseigné.
      if (data.email) await this.createUserWithRole(tx, { email: data.email, motDePasse: data.motDePasse, role: CodeRole.STUDENT, eleveId: eleve.matricule });
      return eleve;
    });
  }

  async createAdmin(data: { email: string; motDePasse?: string }) {
    return this.prisma.$transaction(async (tx) => this.createUserWithRole(tx, { email: data.email, motDePasse: data.motDePasse, role: CodeRole.ADMIN }));
  }

  /** Crée un compte utilisateur avec un mot de passe par défaut si non renseigné. */
  private async createUserWithRole(tx: Prisma.TransactionClient, p: { email: string; motDePasse?: string; role: CodeRole; enseignantId?: string; eleveId?: string }) {
    const role = await tx.role.findUniqueOrThrow({ where: { code: p.role } });
    const motDePasse = await bcrypt.hash(p.motDePasse && p.motDePasse.trim() ? p.motDePasse : DEFAULT_PASSWORD[p.role], 12);
    return tx.utilisateur.create({ data: { email: p.email, nomUtilisateur: p.email, motDePasse, idRole: role.id, enseignantId: p.enseignantId, eleveId: p.eleveId } });
  }
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

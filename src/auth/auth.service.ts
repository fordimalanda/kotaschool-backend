import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';

type LoginUser = Prisma.UtilisateurGetPayload<{ include: { role: true; enseignant: true; eleve: true } }>;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  /** Se connecte avec l'adresse e-mail + mot de passe. */
  async login(dto: LoginDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
      include: { role: true, enseignant: true, eleve: true },
    });
    if (!user || !user.estActif || !(await bcrypt.compare(dto.motDePasse, user.motDePasse))) throw new UnauthorizedException('Identifiants invalides');
    const payload = { sub: user.id, username: this.displayName(user), role: user.role.code };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        username: this.displayName(user),
        role: user.role.code,
        roleLabel: user.role.libelle,
        teacher: user.enseignant ? { id: user.enseignant.id, nom: user.enseignant.nom, prenom: user.enseignant.prenom } : undefined,
        eleve: user.eleve ? { matricule: user.eleve.matricule, nom: user.eleve.nom, prenom: user.eleve.prenom } : undefined,
      },
    };
  }

  async me(id: string) {
    return this.prisma.utilisateur.findUniqueOrThrow({
      where: { id },
      select: { id: true, nomUtilisateur: true, email: true, estActif: true, role: { select: { code: true, libelle: true } }, enseignant: true, eleve: true },
    });
  }

  private displayName(user: LoginUser): string {
    if (user.enseignant) return `${user.enseignant.nom} ${user.enseignant.prenom}`.trim();
    if (user.eleve) return `${user.eleve.nom} ${user.eleve.prenom}`.trim();
    return user.email ?? user.nomUtilisateur;
  }
}

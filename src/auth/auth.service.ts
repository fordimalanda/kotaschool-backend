import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.utilisateur.findUnique({ where: { nomUtilisateur: dto.nomUtilisateur }, include: { role: true, enseignant: true } });
    if (!user || !user.estActif || !(await bcrypt.compare(dto.motDePasse, user.motDePasse))) throw new UnauthorizedException('Identifiants invalides');
    const payload = { sub: user.id, username: user.nomUtilisateur, role: user.role.code };
    return { accessToken: await this.jwt.signAsync(payload), user: { id: user.id, username: user.nomUtilisateur, role: user.role.code, roleLabel: user.role.libelle, teacher: user.enseignant } };
  }
  async me(id: string) { return this.prisma.utilisateur.findUniqueOrThrow({ where: { id }, select: { id: true, nomUtilisateur: true, estActif: true, role: { select: { code: true, libelle: true } }, enseignant: true } }); }
}

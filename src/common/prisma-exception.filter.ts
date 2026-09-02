import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const UNIQUE_MESSAGES: Record<string, string> = {
  email: 'Cette adresse e-mail est déjà utilisée.',
  nomUtilisateur: 'Ce nom d’utilisateur est déjà pris.',
  matricule: 'Ce matricule existe déjà.',
  libelle: 'Ce libellé existe déjà.',
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exception.code === 'P2025') {
      res.status(HttpStatus.NOT_FOUND).json({ statusCode: 404, message: 'Enregistrement introuvable.' });
      return;
    }
    if (exception.code === 'P2002') {
      const target = exception.meta?.target as string[] | string | undefined;
      const field = (Array.isArray(target) ? target[0] : target) ?? '';
      res.status(HttpStatus.CONFLICT).json({ statusCode: 409, message: UNIQUE_MESSAGES[field] ?? `Une donnée avec cette valeur existe déjà (${field || 'champ unique'}).` });
      return;
    }
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ statusCode: 500, message: 'Erreur interne du serveur.' });
  }
}

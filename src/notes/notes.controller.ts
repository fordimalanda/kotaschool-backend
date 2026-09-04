import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppRole } from '../auth/roles.enum';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { SaveNotesDto } from './dto/save-notes.dto';
import { NotesService } from './notes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  // --- Enseignant ---
  @Roles(AppRole.TEACHER)
  @Get('context')
  context(@Req() req: { user: { id: string } }) {
    return this.notes.teacherContext(req.user.id);
  }

  @Roles(AppRole.TEACHER)
  @Post('evaluations')
  create(@Body() dto: CreateEvaluationDto, @Req() req: { user: { id: string } }) {
    return this.notes.createEvaluation(dto, req.user.id);
  }

  @Roles(AppRole.TEACHER)
  @Post('batch')
  save(@Body() dto: SaveNotesDto, @Req() req: { user: { id: string } }) {
    return this.notes.saveNotesBatch(dto, req.user.id);
  }

  @Roles(AppRole.TEACHER)
  @Post('evaluations/:id/soumettre')
  submit(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notes.submitEvaluation(id, req.user.id);
  }

  // --- Consultation grille (enseignant propriétaire, admin) ---
  @Roles(AppRole.TEACHER, AppRole.ADMIN)
  @Get('grille/:id')
  grille(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notes.grille(id, req.user.id);
  }

  // --- Bulletins (calcul + consultation, admin) ---
  @Roles(AppRole.ADMIN)
  @Post('bulletins/semestre/:id/calculer')
  recalculate(@Param('id') id: string) {
    return this.notes.recalculateSemestre(id);
  }

  @Roles(AppRole.ADMIN)
  @Get('bulletins/inscription/:id')
  bulletins(@Param('id') id: string) {
    return this.notes.bulletinsOfInscription(id);
  }

  // --- Élève : consultation de ses résultats ---
  @Roles(AppRole.STUDENT)
  @Get('my-grades')
  myGrades(@Req() req: { user: { id: string } }) {
    return this.notes.myGrades(req.user.id);
  }

  // --- Rapports / Bulletins (admin) ---
  @Roles(AppRole.ADMIN)
  @Get('reports/semestres')
  reportSemestres() {
    return this.notes.reportSemestres();
  }

  @Roles(AppRole.ADMIN)
  @Get('reports/semestre/:id')
  board(@Param('id') id: string) {
    return this.notes.classBulletinBoard(id);
  }

  @Roles(AppRole.ADMIN)
  @Get('reports/inscription/:inscriptionId/semestre/:semestreId')
  detail(@Param('inscriptionId') inscriptionId: string, @Param('semestreId') semestreId: string) {
    return this.notes.inscriptionBulletinDetail(inscriptionId, semestreId);
  }

  // --- Bulletin annuel élève ---
  @Roles(AppRole.STUDENT)
  @Get('my-annual-bulletin')
  myAnnualBulletin(@Req() req: { user: { id: string } }) {
    return this.notes.myAnnualBulletin(req.user.id);
  }

  // --- Recalcul bulletin annuel (admin) ---
  @Roles(AppRole.ADMIN)
  @Post('bulletins/annee/:id/calculer')
  recalculateAnnuel(@Param('id') id: string) {
    return this.notes.recalculateAnnuel(id);
  }
}

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

  // --- Consultation (enseignant propriétaire, conseil, admin) ---
  @Roles(AppRole.TEACHER, AppRole.PEDAGOGICAL_COUNCIL, AppRole.ADMIN)
  @Get('grille/:id')
  grille(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notes.grille(id, req.user.id);
  }

  // --- Conseil pédagogique / Admin : validation ---
  @Roles(AppRole.PEDAGOGICAL_COUNCIL, AppRole.ADMIN)
  @Get('validations')
  pending() {
    return this.notes.pendingValidations();
  }

  @Roles(AppRole.PEDAGOGICAL_COUNCIL, AppRole.ADMIN)
  @Post('validations/:id/valider')
  validate(@Param('id') id: string, @Req() req: { user: { id: string } }) {
    return this.notes.validateEvaluation(id, req.user.id);
  }

  // --- Bulletins (calcul + consultation) ---
  @Roles(AppRole.TEACHER, AppRole.SECRETARY, AppRole.PEDAGOGICAL_COUNCIL, AppRole.ADMIN)
  @Post('bulletins/semestre/:id/calculer')
  recalculate(@Param('id') id: string) {
    return this.notes.recalculateSemestre(id);
  }

  @Roles(AppRole.TEACHER, AppRole.SECRETARY, AppRole.PEDAGOGICAL_COUNCIL, AppRole.ADMIN)
  @Get('bulletins/inscription/:id')
  bulletins(@Param('id') id: string) {
    return this.notes.bulletinsOfInscription(id);
  }
}

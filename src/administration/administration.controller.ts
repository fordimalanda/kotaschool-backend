import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppRole } from '../auth/roles.enum';
import { AdministrationService } from './administration.service';
class LabelDto { @IsString() libelle!: string; }
class TeacherDto { @IsString() nom!: string; @IsOptional() @IsString() postnom?: string; @IsString() prenom!: string; @IsIn(['M','F']) sexe!: 'M' | 'F'; @IsOptional() @IsString() telephone?: string; @IsOptional() @IsEmail() email?: string; }
class StudentDto { @IsString() matricule!: string; @IsString() nom!: string; @IsOptional() @IsString() postnom?: string; @IsString() prenom!: string; @IsIn(['M','F']) sexe!: 'M' | 'F'; @IsDateString() dateNaissance!: string; @IsOptional() @IsString() lieuNaissance?: string; @IsOptional() @IsString() adresse?: string; }
class OptionDto extends LabelDto { @IsString() idSection!: string; }
class ClasseDto extends LabelDto { @IsString() niveau!: string; @IsString() idOption!: string; }
class AnneeDto extends LabelDto { @IsOptional() @IsBoolean() estActive?: boolean; }
class ClasseMatiereDto { @IsString() idClasse!: string; @IsString() idMatiere!: string; @IsNumber() @Min(1) coefficient!: number; }
class AffectationDto { @IsString() idEnseignant!: string; @IsString() idClasseMatiere!: string; @IsString() idAnnee!: string; }
class InscriptionDto { @IsString() matricule!: string; @IsString() idClasse!: string; @IsString() idAnnee!: string; }
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('administration')
export class AdministrationController {
  constructor(private readonly service: AdministrationService) {}
  @Get('catalogue') catalogue() { return this.service.catalogue(); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('teachers') teacher(@Body() dto: TeacherDto) { return this.service.createTeacher(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('students') student(@Body() dto: StudentDto) { return this.service.createStudent(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('sections') section(@Body() dto: LabelDto) { return this.service.createSection(dto.libelle); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('options') option(@Body() dto: OptionDto) { return this.service.createOption(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('classes') classe(@Body() dto: ClasseDto) { return this.service.createClasse(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('subjects') subject(@Body() dto: LabelDto) { return this.service.createMatiere(dto.libelle); }
  @Roles(AppRole.ADMIN) @Post('academic-years') annee(@Body() dto: AnneeDto) { return this.service.createAnnee(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('class-subjects') classSubject(@Body() dto: ClasseMatiereDto) { return this.service.addClasseMatiere(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('assignments') assignment(@Body() dto: AffectationDto) { return this.service.affecter(dto); }
  @Roles(AppRole.ADMIN, AppRole.SECRETARY) @Post('enrolments') enrolment(@Body() dto: InscriptionDto) { return this.service.inscrire(dto); }
  @Roles(AppRole.TEACHER) @Get('my-assignments') assignments(@Req() req: { user: { id: string } }) { return this.service.teacherAssignments(req.user.id); }
}

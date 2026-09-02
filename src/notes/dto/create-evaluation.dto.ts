import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateEvaluationDto {
  @IsString() libelle!: string;
  @IsString() idAffectation!: string;
  @IsString() idSemestre!: string;
  @IsOptional() @IsString() idPeriode?: string;
  @IsString() idTypeEvaluation!: string;
  @IsOptional() @IsNumber() @Min(1) maximum?: number;
  @IsOptional() @IsNumber() @Min(0) ponderation?: number;
  @IsDateString() dateEvaluation!: string;
}

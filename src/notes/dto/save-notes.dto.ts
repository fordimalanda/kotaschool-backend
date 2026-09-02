import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class NoteRowDto {
  @IsString() idInscription!: string;
  @IsOptional() @IsNumber() @Min(0) valeurNote?: number;
  @IsOptional() @IsString() observation?: string;
}

export class SaveNotesDto {
  @IsString() idEvaluation!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => NoteRowDto) notes!: NoteRowDto[];
}

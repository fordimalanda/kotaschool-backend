import { IsNotEmpty, IsString } from 'class-validator';
export class LoginDto { @IsString() @IsNotEmpty() nomUtilisateur!: string; @IsString() @IsNotEmpty() motDePasse!: string; }

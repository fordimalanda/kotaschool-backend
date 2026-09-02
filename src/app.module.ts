import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AdministrationModule } from './administration/administration.module';
import { NotesModule } from './notes/notes.module';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule, AdministrationModule, NotesModule], controllers: [HealthController] })
export class AppModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotepadEntry } from './entities/notepad-entry.entity';
import { NotepadController } from './notepad.controller';
import { NotepadService } from './notepad.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotepadEntry])],
  controllers: [NotepadController],
  providers: [NotepadService],
})
export class NotepadModule {}

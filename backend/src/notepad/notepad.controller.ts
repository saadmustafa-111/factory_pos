import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateNotepadEntryDto,
  NotepadService,
} from './notepad.service';
import type { CreateNotepadEntryDto as CreateNotepadEntryDtoType } from './notepad.service';

@UseGuards(JwtAuthGuard)
@Controller('notepad')
export class NotepadController {
  constructor(private readonly service: NotepadService) {}

  @Get()
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAll(from, to);
  }

  @Post()
  create(@Body() dto: CreateNotepadEntryDtoType) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateNotepadEntryDtoType>,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

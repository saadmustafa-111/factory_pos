import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotepadEntry } from './entities/notepad-entry.entity';

export interface CreateNotepadEntryDto {
  entry_date?: string;
  title?: string;
  content: string;
}

@Injectable()
export class NotepadService {
  constructor(
    @InjectRepository(NotepadEntry)
    private readonly repo: Repository<NotepadEntry>,
  ) {}

  async findAll(from?: string, to?: string): Promise<NotepadEntry[]> {
    const qb = this.repo
      .createQueryBuilder('entry')
      .orderBy('entry.entry_date', 'DESC')
      .addOrderBy('entry.updated_at', 'DESC');

    if (from) qb.andWhere('entry.entry_date >= :from', { from });
    if (to) qb.andWhere('entry.entry_date <= :to', { to });

    return qb.getMany();
  }

  async create(dto: CreateNotepadEntryDto): Promise<NotepadEntry> {
    const entry = this.repo.create({
      entry_date: dto.entry_date || new Date().toISOString().slice(0, 10),
      title: dto.title?.trim() || null,
      content: dto.content.trim(),
    });
    return this.repo.save(entry);
  }

  async update(
    id: number,
    dto: Partial<CreateNotepadEntryDto>,
  ): Promise<NotepadEntry> {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Notepad entry not found');

    if (dto.entry_date !== undefined) entry.entry_date = dto.entry_date;
    if (dto.title !== undefined) entry.title = dto.title?.trim() || null;
    if (dto.content !== undefined) entry.content = dto.content.trim();

    return this.repo.save(entry);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}

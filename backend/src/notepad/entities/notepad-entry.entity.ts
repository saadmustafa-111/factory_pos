import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notepad_entries')
export class NotepadEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  entry_date: string;

  @Column({ type: 'text', nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

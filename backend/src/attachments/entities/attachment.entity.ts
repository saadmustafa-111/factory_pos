import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  /** Original file name as uploaded */
  @Column()
  originalName: string;

  /** UUID-based filename stored on disk */
  @Column()
  filename: string;

  @Column()
  mimetype: string;

  @Column()
  size: number;

  /**
   * Which record this attachment belongs to.
   * e.g. 'sale', 'customer', 'supplier', 'inventory', 'payment'
   */
  @Column()
  entityType: string;

  @Column()
  entityId: number;

  /** Absolute path to the file on disk */
  @Column()
  filePath: string;

  @CreateDateColumn()
  createdAt: Date;
}

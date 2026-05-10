import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('supplier_opening_balances')
export class SupplierOpeningBalance {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Supplier, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  supplier_id: number;

  /** Human-readable description of what this balance is for */
  @Column({ type: 'text' })
  description: string;

  /** Amount we owe to the supplier */
  @Column({ type: 'float' })
  amount: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  /** Backdatable date */
  @Column({ type: 'text' })
  balance_date: string;

  @CreateDateColumn()
  created_at: Date;
}

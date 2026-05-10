import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('supplier_manual_payments')
export class SupplierManualPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Supplier, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  supplier_id: number;

  /** Human-readable description of the payment */
  @Column({ type: 'text' })
  description: string;

  /** Amount paid to the supplier */
  @Column({ type: 'float' })
  amount: number;

  /** Backdatable date */
  @Column({ type: 'text' })
  payment_date: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  created_at: Date;
}

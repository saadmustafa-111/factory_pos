import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('installment_payments')
export class InstallmentPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer_id: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ nullable: true })
  installment_due_id: number;

  @Column({ nullable: true })
  installment_plan_id: number;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'date' })
  payment_date: string;

  @Column({ default: 'cash' })
  payment_method: string; // 'cash' | 'bank_transfer' | 'cheque' | 'jazzcash' | 'easypaisa'

  @Column({ nullable: true })
  cheque_number: string;

  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 'confirmed' })
  status: string; // 'confirmed' | 'bounced'

  @CreateDateColumn()
  created_at: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_ledger')
export class CustomerLedger {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  customer_id: number;

  @OneToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'float', default: 0 })
  credit_limit: number;

  @Column({ default: 'cash' })
  customer_type: string; // 'cash' | 'credit' | 'installment'

  @Column({ default: 30 })
  payment_term_days: number;

  @Column({ type: 'float', default: 0 })
  total_purchased: number;

  @Column({ type: 'float', default: 0 })
  total_paid: number;

  @Column({ type: 'float', default: 0 })
  remaining_balance: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

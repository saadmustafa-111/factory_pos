import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { AdvancePaymentItem } from './advance-payment-item.entity';

export enum AdvancePaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('advance_payments')
export class AdvancePayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, { eager: true, nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ nullable: true })
  customer_id: number;

  @Column()
  customer_name: string;

  @Column({ nullable: true })
  customer_phone: string;

  @Column({ nullable: true })
  customer_address: string;

  @Column('float')
  total_amount: number;

  @Column('float')
  paid_amount: number;

  @Column({ type: 'date' })
  payment_date: string;

  @Column({ default: 'cash' })
  payment_method: string; // 'cash' | 'bank_transfer' | 'cheque' | etc.

  @Column({ nullable: true })
  expected_pickup_date: string;

  @Column({
    type: 'text',
    default: AdvancePaymentStatus.PENDING,
  })
  status: AdvancePaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => AdvancePaymentItem, (item) => item.advance_payment, {
    cascade: true,
    eager: true,
  })
  items: AdvancePaymentItem[];

  @Column({ nullable: true })
  converted_sale_id: number; // Reference to sale created when picked up

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

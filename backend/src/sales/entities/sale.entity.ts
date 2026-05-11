import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { SaleItem } from './sale-item.entity';

export enum SaleStatus {
  PAID = 'paid',
  PARTIAL = 'partial',
  PENDING = 'pending',
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer, (customer) => customer.sales, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ nullable: true })
  customer_id: number;

  @Column({ nullable: true })
  customer_name: string;

  @Column({ nullable: true })
  customer_phone: string;

  @Column({ type: 'datetime' })
  date: Date;

  @Column({ type: 'datetime', nullable: true })
  due_date: Date;

  @Column({ nullable: true })
  credit_days: number;

  @Column('float')
  total_amount: number;

  @Column('float', { default: 0 })
  loading_charges: number;

  @Column('float', { default: 0 })
  discount: number;

  @Column('float')
  paid_amount: number;

  @Column('float')
  pending_amount: number;

  @Column({ type: 'text' })
  status: SaleStatus;

  @Column({ default: false })
  is_overdue: boolean;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true, eager: true })
  items: SaleItem[];

  @OneToMany(() => Payment, (payment) => payment.sale, {
    cascade: true,
    eager: true,
  })
  payments: Payment[];
}

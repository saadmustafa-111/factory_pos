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
import { Customer } from './customer.entity';
import { InstallmentDue } from './installment-due.entity';

@Entity('installment_plan')
export class InstallmentPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer_id: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ nullable: true })
  sale_id: number;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'float' })
  total_amount: number;

  @Column({ type: 'float', default: 0 })
  down_payment: number;

  @Column({ type: 'float', default: 0 })
  paid_amount: number;

  @Column({ type: 'float' })
  remaining_amount: number;

  @Column()
  number_of_installments: number;

  @Column({ type: 'date' })
  start_date: string;

  @Column({ default: 'active' })
  status: string; // 'active' | 'completed' | 'overdue' | 'cancelled'

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => InstallmentDue, (due) => due.installment_plan, { cascade: true })
  installment_dues: InstallmentDue[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

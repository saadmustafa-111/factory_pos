import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InstallmentPlan } from './installment-plan.entity';

@Entity('installment_due')
export class InstallmentDue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  installment_plan_id: number;

  @ManyToOne(() => InstallmentPlan, (plan) => plan.installment_dues)
  @JoinColumn({ name: 'installment_plan_id' })
  installment_plan: InstallmentPlan;

  @Column()
  installment_number: number;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'float' })
  due_amount: number;

  @Column({ type: 'float', default: 0 })
  paid_amount: number;

  @Column({ type: 'date', nullable: true })
  paid_date: string;

  @Column({ default: 'pending' })
  status: string; // 'pending' | 'paid' | 'partial' | 'overdue'

  @Column({ nullable: true })
  notes: string;
}

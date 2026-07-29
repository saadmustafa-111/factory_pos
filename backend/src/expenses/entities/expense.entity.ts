import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ExpenseCategory {
  TRANSPORT = 'transport',
  LABOUR = 'labour',
  RENT = 'rent',
  UTILITIES = 'utilities',
  SALARY = 'salary',
  MAINTENANCE = 'maintenance',
  OTHER = 'other',
}

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  category: ExpenseCategory;

  @Column('float')
  amount: number;

  @Column({ nullable: true, type: 'text' })
  description: string | undefined;

  /** The calendar date the expense belongs to (YYYY-MM-DD stored as datetime) */
  @Column({ type: 'datetime' })
  date: Date;

  @CreateDateColumn()
  createdAt: Date;
}

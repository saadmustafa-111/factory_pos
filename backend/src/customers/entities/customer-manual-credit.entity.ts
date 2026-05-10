import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('customer_manual_credits')
export class CustomerManualCredit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  customer_id: number;

  /** What the customer owes for — e.g. "Cement 50kg", "Iron Rods" */
  @Column({ type: 'text' })
  item_description: string;

  @Column({ type: 'float' })
  amount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /** The date when this credit was originally created (user can backdate) */
  @Column({ type: 'text' })
  credit_date: string;

  @CreateDateColumn()
  created_at: Date;
}

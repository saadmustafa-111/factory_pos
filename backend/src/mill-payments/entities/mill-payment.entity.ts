import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('mill_payments')
export class MillPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.millPayments, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column()
  supplier_id: number;

  @ManyToOne(() => Inventory, (inventory) => inventory.millPayments, { eager: true })
  @JoinColumn({ name: 'inventory_id' })
  inventory: Inventory;

  @Column()
  inventory_id: number;

  @Column('float')
  amount_paid: number;

  @Column({ type: 'datetime' })
  payment_date: Date;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;
}

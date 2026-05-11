import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MillPayment } from '../../mill-payments/entities/mill-payment.entity';
import { CementBrand } from '../../products/entities/cement-brand.entity';
import { Product } from '../../products/entities/product.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';

export enum InventoryPaymentStatus {
  PAID = 'paid',
  PARTIAL = 'partial',
  PENDING = 'pending',
}

export enum InventoryEntryType {
  PURCHASE = 'purchase',
  OPENING = 'opening',
}

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, (product) => product.inventoryEntries, {
    eager: true,
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  product_id: number;

  @ManyToOne(() => CementBrand, { eager: true, nullable: true })
  @JoinColumn({ name: 'cement_brand_id' })
  cement_brand: CementBrand;

  @Column({ nullable: true })
  cement_brand_id: number;

  @ManyToOne(() => Supplier, (supplier) => supplier.inventoryEntries, {
    eager: true,
    nullable: true,
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ nullable: true })
  supplier_id: number;

  @Column({ type: 'text', default: InventoryEntryType.PURCHASE })
  entry_type: InventoryEntryType;

  @Column('float')
  quantity_received: number;

  @Column('float')
  purchase_price_per_unit: number;

  @Column('float')
  total_cost: number;

  @Column('float', { default: 0 })
  amount_paid_to_mill: number;

  @Column('float', { default: 0 })
  amount_pending_to_mill: number;

  @Column({ type: 'text', default: InventoryPaymentStatus.PENDING })
  payment_status: InventoryPaymentStatus;

  @Column({ type: 'datetime' })
  date: Date;

  @Column({ type: 'datetime', nullable: true })
  pickup_date: Date;

  @Column({ type: 'datetime', nullable: true })
  delivery_date: Date;

  @Column({ nullable: true })
  delivery_location: string;

  @Column({ nullable: true })
  transport_details: string;

  @Column({ type: 'int', nullable: true })
  credit_days: number;

  @Column('float', { default: 0 })
  amount_received_from_mill: number;

  @Column('float', { default: 0 })
  overpayment_amount: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => MillPayment, (millPayment) => millPayment.inventory)
  millPayments: MillPayment[];
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';
import { CementBrand } from '../../products/entities/cement-brand.entity';
import { AdvancePayment } from './advance-payment.entity';

@Entity('advance_payment_items')
export class AdvancePaymentItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AdvancePayment, (payment) => payment.items)
  @JoinColumn({ name: 'advance_payment_id' })
  advance_payment: AdvancePayment;

  @Column()
  advance_payment_id: number;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column()
  product_id: number;

  @ManyToOne(() => CementBrand, { eager: true, nullable: true })
  @JoinColumn({ name: 'cement_brand_id' })
  cement_brand: CementBrand;

  @Column({ nullable: true })
  cement_brand_id: number;

  @Column('float')
  quantity: number;

  @Column('float', { default: 0 })
  quantity_picked: number; // Track how much has been picked up

  @Column()
  unit: string;

  @Column('float')
  rate_per_unit: number;

  @Column('float')
  total_amount: number;
}

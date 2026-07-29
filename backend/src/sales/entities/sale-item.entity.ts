import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CementBrand } from '../../products/entities/cement-brand.entity';
import { Product } from '../../products/entities/product.entity';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Sale, (sale) => sale.items)
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column()
  sale_id: number;

  @ManyToOne(() => Product, (product) => product.saleItems, { eager: true })
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

  @Column('float')
  sale_price_per_unit: number;

  @Column('float', { default: 0 })
  purchase_price_per_unit: number;

  @Column('float')
  total_price: number;
}

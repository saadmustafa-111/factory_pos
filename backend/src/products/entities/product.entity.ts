import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { SaleItem } from '../../sales/entities/sale-item.entity';

export enum ProductCategory {
  SARIYA = 'sariya',
  RINGS = 'rings',
  WIRE = 'wire',
  CEMENT = 'cement',
}

export enum ProductUnit {
  KG = 'kg',
  PIECE = 'piece',
  BAG = 'bag',
  BUNDLE = 'bundle',
  MAUND = 'maund',
  TON = 'ton',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  category: ProductCategory;

  @Column()
  type: string;

  @Column({ type: 'text' })
  unit: ProductUnit;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Inventory, (inventory) => inventory.product)
  inventoryEntries: Inventory[];

  @OneToMany(() => SaleItem, (saleItem) => saleItem.product)
  saleItems: SaleItem[];
}

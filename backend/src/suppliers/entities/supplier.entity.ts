import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Inventory } from '../../inventory/entities/inventory.entity';
import { MillPayment } from '../../mill-payments/entities/mill-payment.entity';
import { CementBrand } from '../../products/entities/cement-brand.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  contact_person: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: true })
  is_active: boolean;

  // New fields for enhanced supplier details
  @Column({ nullable: true })
  dealer_name: string;

  @Column({ nullable: true })
  business_name: string;

  @Column({ nullable: true })
  cnic: string;

  @Column({ nullable: true })
  image_url: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => CementBrand, (brand) => brand.supplier)
  cementBrands: CementBrand[];

  @OneToMany(() => Inventory, (inventory) => inventory.supplier)
  inventoryEntries: Inventory[];

  @OneToMany(() => MillPayment, (payment) => payment.supplier)
  millPayments: MillPayment[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';

@Entity('cement_brands')
export class CementBrand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  brand_name: string;

  @ManyToOne(() => Supplier, (supplier) => supplier.cementBrands, { eager: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ nullable: true })
  supplier_id: number;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}

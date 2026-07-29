import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ManagedOptionScope {
  PRODUCT_CATEGORY = 'product_category',
  PRODUCT_TYPE = 'product_type',
  PRODUCT_UNIT = 'product_unit',
  EXPENSE_CATEGORY = 'expense_category',
}

@Entity('managed_options')
@Index(['scope', 'normalized_name'], { unique: true })
export class ManagedOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  scope: ManagedOptionScope;

  @Column()
  name: string;

  @Column()
  normalized_name: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

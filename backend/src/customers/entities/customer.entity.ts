import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Sale } from '../../sales/entities/sale.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  notes: string;

  // New fields for enhanced customer details
  @Column({ default: false })
  has_vehicle: boolean;

  @Column({ nullable: true })
  vehicle_number: string;

  @Column({ nullable: true })
  cnic: string;

  @Column({ nullable: true })
  relation_with_me: string;

  @Column({ nullable: true })
  image_url: string;

  @Column({ nullable: true })
  gmail: string;

  @Column({ nullable: true })
  facebook_link: string;

  @Column({ nullable: true })
  social_link: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Sale, (sale) => sale.customer)
  sales: Sale[];

  @OneToMany(() => Payment, (payment) => payment.customer)
  payments: Payment[];
}

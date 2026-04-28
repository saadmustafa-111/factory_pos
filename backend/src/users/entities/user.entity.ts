import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password_hash: string;

  @Column({ default: 'admin' })
  role: string;

  @Column({ nullable: true, type: 'text' })
  recovery_pin_hash: string | undefined;

  @CreateDateColumn()
  created_at: Date;
}

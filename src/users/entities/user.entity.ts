import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { UserRole } from '../../roles/entities/user-role.entity';
import { Address } from '../../address/entities/address.entity';
import { Order } from '../../orders/entities/order.entity';
import { OrderItemAssignment } from '../../orders/entities/order-item-assignment.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Review } from '../../review/entities/review.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToMany(() => UserRole, (ur) => ur.user, { cascade: true })
  roles: UserRole[];

  @OneToMany(() => Address, (a) => a.user)
  addresses: Address[];

  @OneToMany(() => Order, (o) => o.customer)
  orders: Order[];

  @OneToMany(() => OrderItemAssignment, (a) => a.assistant)
  assignments: OrderItemAssignment[];

  @OneToMany(() => Payment, (p) => p.order)
  paymentsInitiated: Payment[];

  @OneToMany(() => Review, (r) => r.customer)
  reviewsGiven: Review[];

  @OneToMany(() => Review, (r) => r.assistant)
  reviewsReceived: Review[];
}

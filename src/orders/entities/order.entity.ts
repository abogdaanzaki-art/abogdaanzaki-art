import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Address } from '../../address/entities/address.entity';
import { Promotion } from '../../promotion/entities/promotion.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from '../../payment/entities/payment.entity';
import { Review } from '../../review/entities/review.entity';
import { OrderStatus } from '../order-status.enum';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'address_id' })
  addressId: number;

  @Column({ name: 'promotion_id', nullable: true })
  promotionId: number | null;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: OrderStatus;

  @Column({ name: 'subtotal', type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'total_price', type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ name: 'address_snapshot', type: 'text', nullable: true })
  addressSnapshot: string;

  @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
  scheduledAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => User, (u) => u.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => Address, (a) => a.orders)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @ManyToOne(() => Promotion, (p) => p.orders)
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion | null;

  @OneToMany(() => OrderItem, (oi) => oi.order, { cascade: true })
  items: OrderItem[];

  @OneToMany(() => Payment, (p) => p.order)
  payments: Payment[];

  @OneToMany(() => Review, (r) => r.order)
  reviews: Review[];
}

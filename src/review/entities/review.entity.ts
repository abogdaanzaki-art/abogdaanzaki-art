import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Unique } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';

@Entity('reviews')
@Unique('UQ_order_assistant', ['orderId', 'assistantId'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @Column({ name: 'assistant_id' })
  assistantId: number;

  @Column()
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => Order, (o) => o.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => User, (u) => u.reviewsGiven, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @ManyToOne(() => User, (u) => u.reviewsReceived, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assistant_id' })
  assistant: User;
}

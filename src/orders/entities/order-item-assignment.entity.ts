import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { User } from '../../users/entities/user.entity';
import { AssignmentStatus } from '../order-status.enum';

@Entity('order_item_assignments')
export class OrderItemAssignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_item_id' })
  orderItemId: number;

  @Column({ name: 'assistant_id' })
  assistantId: number;

  @Column({ type: 'varchar', default: 'OFFERED' })
  status: AssignmentStatus;

  @Column({ name: 'offered_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  offeredAt: Date;

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt: Date | null;

  @ManyToOne(() => OrderItem, (oi) => oi.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  @ManyToOne(() => User, (u) => u.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assistant_id' })
  assistant: User;
}

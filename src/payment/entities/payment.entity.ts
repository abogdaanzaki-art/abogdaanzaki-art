import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PaymentMethod, PaymentStatus } from '../payment.types';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id' })
  orderId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: 'CASH' })
  method: PaymentMethod;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: PaymentStatus;

  @Column({ name: 'transaction_ref', nullable: true })
  transactionRef: string;

  @Column({ name: 'paid_at', type: 'datetime', nullable: true })
  paidAt: Date | null;

  @ManyToOne(() => Order, (o) => o.payments)
  @JoinColumn({ name: 'order_id' })
  order: Order;
}

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { PromotionService } from './promotion-service.entity';
import { PromotionType } from '../promotion.types';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: PromotionType;

  @Column({ name: 'min_services', default: 2 })
  minServices: number;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2, default: 10 })
  discountValue: number;

  @Column({ name: 'starts_at', type: 'datetime', nullable: true })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'datetime', nullable: true })
  endsAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => Order, (o) => o.promotion)
  orders: Order[];

  @OneToMany(() => PromotionService, (ps) => ps.promotion, { cascade: true })
  services: PromotionService[];
}

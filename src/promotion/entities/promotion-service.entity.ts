import { Entity, PrimaryColumn, ManyToOne, JoinColumn, Column, RelationId } from 'typeorm';
import { Promotion } from './promotion.entity';
import { ServiceType } from '../../service-type/entities/service-type.entity';

@Entity('promotion_services')
export class PromotionService {
  @PrimaryColumn({ name: 'promotion_id' })
  @RelationId((ps: PromotionService) => ps.promotion)
  promotionId: number;

  @PrimaryColumn({ name: 'service_type_id' })
  @RelationId((ps: PromotionService) => ps.serviceType)
  serviceTypeId: number;

  @Column({ name: 'special_price', type: 'decimal', precision: 10, scale: 2 })
  specialPrice: number;

  @ManyToOne(() => Promotion, (p) => p.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @ManyToOne(() => ServiceType, (s) => s.promotions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType: ServiceType;
}

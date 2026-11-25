import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Promotion } from '../promotion/entities/promotion.entity';
import { PromotionService } from '../promotion/entities/promotion-service.entity';
import { OrderItemInputDto } from './dto/order.dto';

export interface PricedItem {
  serviceTypeId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  details?: string;
  appliedSpecialPrice: boolean;
}

export interface PriceResult {
  items: PricedItem[];
  subtotal: number;
  discountAmount: number;
  totalPrice: number;
  promotion: Promotion | null;
}

const MULTI_SERVICE_DISCOUNT_PERCENT = 10;

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(ServiceType) private services: Repository<ServiceType>,
    @InjectRepository(Promotion) private promos: Repository<Promotion>,
    @InjectRepository(PromotionService) private promoServices: Repository<PromotionService>,
  ) {}

  /**
   * Pricing rules (priority, no double-discount on same service):
   * 1. WEEKLY_SPECIAL_PRICE: services listed in PromotionService get a special unit price.
   *    These services are EXCLUDED from the multi-service 10% discount.
   * 2. MULTI_SERVICE_PERCENT: if order has >= minServices distinct service types
   *    (after excluding special-priced ones), apply discountValue% to each remaining item.
   * Prices/discounts are frozen into order items at creation time.
   */
  async priceOrder(
    items: OrderItemInputDto[],
    promotionId?: number,
  ): Promise<PriceResult> {
    if (!items || items.length === 0) throw new BadRequestException('Order must contain at least one service');

    // Load service types
    const serviceIds = Array.from(new Set(items.map((i) => i.serviceTypeId)));
    const serviceTypes = await this.services.findByIds(serviceIds);
    const serviceMap = new Map(serviceTypes.map((s) => [s.id, s]));
    for (const id of serviceIds) {
      if (!serviceMap.has(id)) throw new NotFoundException(`Service type ${id} not found`);
      if (!serviceMap.get(id)!.isActive) throw new BadRequestException(`Service type ${id} is inactive`);
    }

    // Load promotion if provided
    let promotion: Promotion | null = null;
    let specialPriceMap = new Map<number, number>();
    if (promotionId) {
      promotion = await this.promos.findOne({
        where: { id: promotionId },
        relations: ['services'],
      });
      if (!promotion) throw new NotFoundException('Promotion not found');
      if (!promotion.isActive) throw new BadRequestException('Promotion is not active');
      const now = new Date();
      if (promotion.startsAt && promotion.startsAt > now) throw new BadRequestException('Promotion not started');
      if (promotion.endsAt && promotion.endsAt < now) throw new BadRequestException('Promotion expired');

      if (promotion.type === 'WEEKLY_SPECIAL_PRICE') {
        for (const ps of promotion.services) {
          specialPriceMap.set(ps.serviceTypeId, Number(ps.specialPrice));
        }
      }
    }

    const pricedItems: PricedItem[] = items.map((i) => {
      const st = serviceMap.get(i.serviceTypeId)!;
      const special = specialPriceMap.get(i.serviceTypeId);
      const appliedSpecialPrice = special !== undefined;
      const unitPrice = appliedSpecialPrice ? special! : Number(st.basePrice);
      const subtotal = +(unitPrice * i.quantity).toFixed(2);
      return {
        serviceTypeId: i.serviceTypeId,
        quantity: i.quantity,
        unitPrice: +unitPrice.toFixed(2),
        subtotal,
        discountAmount: 0,
        total: subtotal,
        details: i.details,
        appliedSpecialPrice,
      };
    });

    // Multi-service percent discount: only on items NOT special-priced.
    // Eligible distinct service types count.
    const eligibleItems = pricedItems.filter((p) => !p.appliedSpecialPrice);
    const distinctEligibleTypes = new Set(eligibleItems.map((p) => p.serviceTypeId)).size;

    const multiPromo =
      promotion && promotion.type === 'MULTI_SERVICE_PERCENT'
        ? promotion
        : null;

    let orderSubtotal = 0;
    let orderDiscount = 0;

    // Determine whether multi-service discount applies.
    // If a MULTI_SERVICE_PERCENT promotion is provided, use its minServices + discountValue.
    // Otherwise apply the default 10% when distinct eligible types >= 2.
    let multiApplies = false;
    let multiPercent = MULTI_SERVICE_DISCOUNT_PERCENT;
    let minServices = 2;
    if (multiPromo) {
      minServices = multiPromo.minServices;
      multiPercent = Number(multiPromo.discountValue);
    }
    if (distinctEligibleTypes >= minServices) {
      multiApplies = true;
    }

    for (const p of pricedItems) {
      orderSubtotal += p.subtotal;
      if (multiApplies && !p.appliedSpecialPrice) {
        p.discountAmount = +((p.subtotal * multiPercent) / 100).toFixed(2);
        p.total = +(p.subtotal - p.discountAmount).toFixed(2);
        orderDiscount += p.discountAmount;
      }
    }

    return {
      items: pricedItems,
      subtotal: +orderSubtotal.toFixed(2),
      discountAmount: +orderDiscount.toFixed(2),
      totalPrice: +(orderSubtotal - orderDiscount).toFixed(2),
      promotion,
    };
  }
}

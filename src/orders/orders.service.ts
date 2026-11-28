import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Address } from '../address/entities/address.entity';
import { PricingService } from './pricing.service';
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto';
import { OrderStatus } from './order-status.enum';
import { paginate, paginated } from '../common/pagination';
import { toSafeOrder, toSafeOrderArray } from '../common/safe-responses.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(OrderItem) private items: Repository<OrderItem>,
    @InjectRepository(Address) private addresses: Repository<Address>,
    private pricing: PricingService,
    private dataSource: DataSource,
  ) {}

  async create(customerId: number, dto: CreateOrderDto) {
    const address = await this.addresses.findOne({ where: { id: dto.addressId } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== customerId) throw new ForbiddenException('Address does not belong to you');

    const price = await this.pricing.priceOrder(dto.items, dto.promotionId);

    return this.dataSource.transaction(async (em) => {
      const order = em.create(Order, {
        customerId,
        addressId: dto.addressId,
        promotionId: price.promotion?.id ?? null,
        status: 'PENDING' as OrderStatus,
        subtotal: price.subtotal,
        discountAmount: price.discountAmount,
        totalPrice: price.totalPrice,
        addressSnapshot: `${address.addressLine}, ${address.city}`,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        items: [],
      });
      await em.save(order);

      for (const p of price.items) {
        const item = em.create(OrderItem, {
          orderId: order.id,
          serviceTypeId: p.serviceTypeId,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          subtotal: p.subtotal,
          discountAmount: p.discountAmount,
          total: p.total,
          status: 'PENDING',
          details: p.details,
        });
        await em.save(item);
        order.items.push(item);
      }

      const reloaded = await em.findOne(Order, {
        where: { id: order.id },
        relations: ['items', 'items.serviceType', 'items.assignments', 'items.assignments.assistant', 'customer', 'address', 'promotion'],
      });
      return toSafeOrder(reloaded!);
    });
  }

  async findMine(customerId: number, query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'oi')
      .leftJoinAndSelect('oi.serviceType', 'st')
      .where('o.customerId = :customerId', { customerId })
      .orderBy('o.createdAt', 'DESC');
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return paginated(toSafeOrderArray(data), total, page, limit);
  }

  async findAllAdmin(query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.orders
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'c')
      .leftJoinAndSelect('o.items', 'oi')
      .leftJoinAndSelect('oi.serviceType', 'st')
      .orderBy('o.createdAt', 'DESC');
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.customerId) qb.andWhere('o.customerId = :cid', { cid: query.customerId });
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return paginated(toSafeOrderArray(data), total, page, limit);
  }

  async findOne(id: number, userId?: number, requireOwnership = false) {
    const order = await this.orders.findOne({
      where: { id },
      relations: ['items', 'items.serviceType', 'items.assignments', 'items.assignments.assistant', 'customer', 'address', 'promotion'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (requireOwnership && order.customerId !== userId) {
      throw new ForbiddenException('Order does not belong to you');
    }
    return toSafeOrder(order);
  }

  async update(id: number, userId: number, dto: UpdateOrderDto) {
    const order = await this.orders.findOne({
      where: { id },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== userId) throw new ForbiddenException('Order does not belong to you');
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot update a completed or cancelled order');
    }
    if (dto.scheduledAt) order.scheduledAt = new Date(dto.scheduledAt);
    if (dto.status) {
      if (!['PENDING', 'CANCELLED'].includes(dto.status)) {
        throw new BadRequestException('You can only cancel or keep pending via this endpoint');
      }
      order.status = dto.status as OrderStatus;
      if (order.status === 'CANCELLED') {
        for (const it of order.items) it.status = 'CANCELLED';
        await this.items.save(order.items);
      }
    }
    await this.orders.save(order);
    return this.findOne(id, userId, true);
  }

  async cancel(id: number, userId: number) {
    return this.update(id, userId, { status: 'CANCELLED' });
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { CreatePaymentDto, UpdatePaymentStatusDto } from './dto/payment.dto';
import { PaymentStatus } from './payment.types';
import { paginate, paginated } from '../common/pagination';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(Order) private orders: Repository<Order>,
    private dataSource: DataSource,
  ) {}

  async create(customerId: number, dto: CreatePaymentDto) {
    const order = await this.orders.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status === 'CANCELLED') throw new BadRequestException('Cannot pay for a cancelled order');

    // Only CASH is supported in v1. CARD is structured for future gateway integration.
    if (dto.method === 'CARD') {
      throw new BadRequestException('Card payments not yet supported');
    }

    const payment = this.payments.create({
      orderId: order.id,
      amount: order.totalPrice,
      method: dto.method,
      status: 'PENDING' as PaymentStatus,
      transactionRef: dto.transactionRef,
    });
    return this.payments.save(payment);
  }

  async findByOrder(orderId: number, userId: number, isAdmin: boolean) {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (!isAdmin && order.customerId !== userId) throw new ForbiddenException('Not your order');
    return this.payments.find({ where: { orderId }, order: { id: 'DESC' } });
  }

  async findByUser(userId: number, query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.payments
      .createQueryBuilder('p')
      .innerJoin('p.order', 'o')
      .where('o.customerId = :userId', { userId })
      .orderBy('p.id', 'DESC');
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async updateStatus(id: number, dto: UpdatePaymentStatusDto) {
    return this.dataSource.transaction(async (em) => {
      const payment = await em.findOne(Payment, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!payment) throw new NotFoundException('Payment not found');
      const newStatus = dto.status as PaymentStatus;
      if (payment.status === newStatus) return payment;
      payment.status = newStatus;
      if (newStatus === 'PAID') payment.paidAt = new Date();
      if (dto.transactionRef) payment.transactionRef = dto.transactionRef;
      return em.save(payment);
    });
  }
}

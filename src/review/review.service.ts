import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItemAssignment } from '../orders/entities/order-item-assignment.entity';
import { CreateReviewDto } from './dto/review.dto';
import { toSafeReview, toSafeReviewArray } from '../common/safe-responses.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(OrderItemAssignment) private assignments: Repository<OrderItemAssignment>,
  ) {}

  async create(customerId: number, dto: CreateReviewDto) {
    const order = await this.orders.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('Not your order');
    if (order.status !== 'COMPLETED') {
      throw new BadRequestException('Cannot review before order is completed');
    }

    const participated = await this.assignments.findOne({
      where: { assistantId: dto.assistantId, status: 'ACCEPTED' },
      relations: ['orderItem'],
    });
    if (!participated || participated.orderItem.orderId !== dto.orderId) {
      throw new BadRequestException('Assistant did not participate in this order');
    }

    const existing = await this.reviews.findOne({
      where: { orderId: dto.orderId, assistantId: dto.assistantId },
    });
    if (existing) throw new ConflictException('You already reviewed this assistant for this order');

    const review = this.reviews.create({
      orderId: dto.orderId,
      customerId,
      assistantId: dto.assistantId,
      rating: dto.rating,
      comment: dto.comment,
    });
    const saved = await this.reviews.save(review);
    const reloaded = await this.reviews.findOne({
      where: { id: saved.id },
      relations: ['customer', 'assistant'],
    });
    return toSafeReview(reloaded!);
  }

  async findByAssistant(assistantId: number) {
    const reviews = await this.reviews.find({
      where: { assistantId },
      relations: ['customer', 'order'],
      order: { createdAt: 'DESC' },
    });
    return toSafeReviewArray(reviews);
  }

  async findByOrder(orderId: number) {
    const reviews = await this.reviews.find({ where: { orderId }, relations: ['assistant', 'customer'] });
    return toSafeReviewArray(reviews);
  }
}

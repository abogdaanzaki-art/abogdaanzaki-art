import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemAssignment } from './entities/order-item-assignment.entity';
import { Order } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { AssistantProfile } from '../assistant-profile/entities/assistant-profile.entity';
import { AssignmentStatus, OrderItemStatus, OrderStatus } from './order-status.enum';
import { OfferAssignmentsDto, UpdateAssignmentStatusDto, UpdateOrderItemStatusDto } from './dto/assignment.dto';
import { paginate, paginated } from '../common/pagination';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(OrderItem) private items: Repository<OrderItem>,
    @InjectRepository(OrderItemAssignment) private assignments: Repository<OrderItemAssignment>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    @InjectRepository(AssistantProfile) private profiles: Repository<AssistantProfile>,
    private dataSource: DataSource,
  ) {}

  private async ensureAssistant(userId: number) {
    const roles = await this.userRoles.find({ where: { userId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'ASSISTANT')) {
      throw new ForbiddenException('User is not an assistant');
    }
  }

  /** Admin or customer creates offers for an order item to a set of assistants. */
  async offer(
    orderItemId: number,
    dto: OfferAssignmentsDto,
    actorId: number,
    actorRoles: string[],
  ) {
    const item = await this.items.findOne({ where: { id: orderItemId }, relations: ['order'] });
    if (!item) throw new NotFoundException('Order item not found');
    if (item.status === 'COMPLETED' || item.status === 'CANCELLED') {
      throw new BadRequestException('Cannot offer a completed/cancelled item');
    }

    // Customer ownership check
    if (actorRoles.includes('CUSTOMER') && !actorRoles.includes('ADMIN')) {
      if (item.order.customerId !== actorId) {
        throw new ForbiddenException('You can only create offers for your own orders');
      }
    }

    // Eligibility check for each assistant
    for (const aid of dto.assistantIds) {
      await this.checkAssistantEligibility(aid, item.serviceTypeId);
    }

    const created: OrderItemAssignment[] = [];
    for (const aid of dto.assistantIds) {
      const existing = await this.assignments.findOne({ where: { orderItemId, assistantId: aid } });
      if (existing) continue;
      const a = this.assignments.create({
        orderItemId,
        assistantId: aid,
        status: 'OFFERED' as AssignmentStatus,
        offeredAt: new Date(),
      });
      created.push(await this.assignments.save(a));
    }
    if (item.status === 'PENDING') {
      item.status = 'OFFERED' as OrderItemStatus;
      await this.items.save(item);
    }
    return created;
  }

  /** Verify an assistant is eligible to receive an offer for a given service type. */
  private async checkAssistantEligibility(assistantId: number, serviceTypeId: number) {
    const user = await this.users.findOne({ where: { id: assistantId } });
    if (!user) throw new BadRequestException(`User ${assistantId} not found`);
    if (!user.isActive) throw new BadRequestException(`User ${assistantId} is inactive`);

    const roles = await this.userRoles.find({ where: { userId: assistantId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'ASSISTANT')) {
      throw new BadRequestException(`User ${assistantId} is not an assistant`);
    }

    const profile = await this.profiles.findOne({
      where: { userId: assistantId },
      relations: ['services'],
    });
    if (!profile) {
      throw new BadRequestException(`Assistant ${assistantId} has no profile`);
    }
    if (profile.verificationStatus !== 'APPROVED') {
      throw new BadRequestException(`Assistant ${assistantId} is not verified`);
    }
    if (!profile.isAvailable) {
      throw new BadRequestException(`Assistant ${assistantId} is not currently available`);
    }
    if (!profile.services.some((s) => s.id === serviceTypeId)) {
      throw new BadRequestException(`Assistant ${assistantId} does not support service type ${serviceTypeId}`);
    }
  }

  /**
   * Accept an offer. Concurrency safety: an atomic conditional UPDATE ensures
   * only one assistant can ACCEPT a given order item. If another assistant
   * already accepted, the affected row count is 0 and we throw a conflict.
   */
  async respond(assignmentId: number, assistantId: number, dto: UpdateAssignmentStatusDto) {
    await this.ensureAssistant(assistantId);
    const assignment = await this.assignments.findOne({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.assistantId !== assistantId) throw new ForbiddenException('Not your assignment');
    if (assignment.status !== 'OFFERED') {
      throw new BadRequestException(`Assignment already ${assignment.status}`);
    }

    const newStatus = dto.status as AssignmentStatus;
    if (!['ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(newStatus)) {
      throw new BadRequestException('Invalid status response');
    }

    if (newStatus === 'ACCEPTED') {
      return this.dataSource.transaction(async (em) => {
        const item = await em.findOne(OrderItem, {
          where: { id: assignment.orderItemId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!item) throw new NotFoundException('Order item not found');
        if (item.status === 'ASSIGNED' || item.status === 'IN_PROGRESS' || item.status === 'COMPLETED') {
          throw new ConflictException('Order item already assigned to another assistant');
        }

        const result = await em
          .createQueryBuilder()
          .update(OrderItemAssignment)
          .set({ status: 'ACCEPTED' as AssignmentStatus, respondedAt: new Date() })
          .where('id = :id AND status = :status', { id: assignmentId, status: 'OFFERED' })
          .execute();

        if (result.affected === 0) {
          throw new ConflictException('Assignment was no longer offerable');
        }

        await em
          .createQueryBuilder()
          .update(OrderItemAssignment)
          .set({ status: 'REJECTED' as AssignmentStatus, respondedAt: new Date() })
          .where('orderItemId = :itemId AND id != :id AND status = :status', {
            itemId: item.id,
            id: assignmentId,
            status: 'OFFERED',
          })
          .execute();

        item.status = 'ASSIGNED' as OrderItemStatus;
        item.startedAt = new Date();
        await em.save(item);

        await this.refreshOrderStatus(em, item.orderId);

        return em.findOne(OrderItemAssignment, { where: { id: assignmentId }, relations: ['orderItem', 'assistant'] });
      });
    }

    assignment.status = newStatus;
    assignment.respondedAt = new Date();
    await this.assignments.save(assignment);
    return assignment;
  }

  async myOffers(assistantId: number, query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.assignments
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.orderItem', 'oi')
      .leftJoinAndSelect('oi.order', 'o')
      .leftJoinAndSelect('oi.serviceType', 'st')
      .where('a.assistantId = :assistantId', { assistantId })
      .orderBy('a.offeredAt', 'DESC');
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async myTasks(assistantId: number, query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.items
      .createQueryBuilder('oi')
      .innerJoin(OrderItemAssignment, 'a', 'a.orderItemId = oi.id')
      .leftJoinAndSelect('oi.order', 'o')
      .leftJoinAndSelect('oi.serviceType', 'st')
      .where('a.assistantId = :assistantId AND a.status = :status', { assistantId, status: 'ACCEPTED' })
      .orderBy('oi.startedAt', 'DESC');
    if (query.itemStatus) qb.andWhere('oi.status = :s', { s: query.itemStatus });
    const [data, total] = await qb.skip(skip).take(take).getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async updateItemStatus(orderItemId: number, assistantId: number, dto: UpdateOrderItemStatusDto) {
    await this.ensureAssistant(assistantId);
    return this.dataSource.transaction(async (em) => {
      const item = await em.findOne(OrderItem, {
        where: { id: orderItemId },
        relations: ['assignments'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new NotFoundException('Order item not found');

      const accepted = item.assignments.find((a) => a.status === 'ACCEPTED' && a.assistantId === assistantId);
      if (!accepted) throw new ForbiddenException('You have not accepted this item');

      const newStatus = dto.status as OrderItemStatus;
      if (!['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
        throw new BadRequestException('Invalid item status');
      }
      item.status = newStatus;
      if (newStatus === 'IN_PROGRESS' && !item.startedAt) item.startedAt = new Date();
      if (newStatus === 'COMPLETED') item.completedAt = new Date();
      await em.save(item);
      await this.refreshOrderStatus(em, item.orderId);
      return item;
    });
  }

  private async refreshOrderStatus(em: any, orderId: number) {
    const items = await em.find(OrderItem, { where: { orderId } });
    if (items.length === 0) return;
    const allCompleted = items.every((i: OrderItem) => i.status === 'COMPLETED' || i.status === 'CANCELLED');
    const anyInProgress = items.some((i: OrderItem) => i.status === 'IN_PROGRESS' || i.status === 'ASSIGNED');
    const order = await em.findOne(Order, { where: { id: orderId } });
    if (!order) return;
    if (allCompleted) order.status = 'COMPLETED' as OrderStatus;
    else if (anyInProgress) order.status = 'IN_PROGRESS' as OrderStatus;
    else if (items.some((i: OrderItem) => i.status === 'OFFERED')) order.status = 'ASSIGNED' as OrderStatus;
    await em.save(order);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemAssignment } from './entities/order-item-assignment.entity';
import { Order } from './entities/order.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { AssistantProfile } from '../assistant-profile/entities/assistant-profile.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  createQueryBuilder: jest.Mock;
};

function mockRepo(): RepoMock {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (e: any) => e),
    create: jest.fn((_, values?: any) => (values ? { ...values } : ({} as any))),
    createQueryBuilder: jest.fn(() => qb),
  };
}

function role(name: string) {
  return { role: { name } } as any;
}

function makeItem(over: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 1,
    orderId: 100,
    serviceTypeId: 5,
    quantity: 1,
    unitPrice: 50,
    subtotal: 50,
    discountAmount: 0,
    total: 50,
    status: 'PENDING',
    startedAt: null,
    completedAt: null,
    details: null,
    order: { id: 100, customerId: 7, status: 'PENDING' } as any,
    ...over,
  } as OrderItem;
}

function makeAssignment(over: Partial<OrderItemAssignment> = {}): OrderItemAssignment {
  return {
    id: 1,
    orderItemId: 1,
    assistantId: 20,
    status: 'OFFERED',
    offeredAt: new Date(),
    respondedAt: null,
    ...over,
  } as OrderItemAssignment;
}

function makeProfile(over: Partial<AssistantProfile> = {}): AssistantProfile {
  return {
    id: 1,
    userId: 20,
    bio: null,
    profileImageUrl: null,
    city: 'Riyadh',
    verificationStatus: 'APPROVED',
    isAvailable: true,
    services: [{ id: 5, code: 'CLEAN', name: 'Cleaning' } as ServiceType],
    ...over,
  } as AssistantProfile;
}

describe('AssignmentsService', () => {
  let service: AssignmentsService;
  let items: RepoMock;
  let assignments: RepoMock;
  let orders: RepoMock;
  let users: RepoMock;
  let userRoles: RepoMock;
  let profiles: RepoMock;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    items = mockRepo();
    assignments = mockRepo();
    orders = mockRepo();
    users = mockRepo();
    userRoles = mockRepo();
    profiles = mockRepo();
    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const em: any = {
          findOne: async () => makeItem({ status: 'PENDING', assignments: [makeAssignment()] }),
          find: async () => [],
          save: async (e: any) => e,
          createQueryBuilder: () => ({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
          }),
        };
        return cb(em);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentsService,
        { provide: getRepositoryToken(OrderItem), useValue: items },
        { provide: getRepositoryToken(OrderItemAssignment), useValue: assignments },
        { provide: getRepositoryToken(Order), useValue: orders },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(UserRole), useValue: userRoles },
        { provide: getRepositoryToken(AssistantProfile), useValue: profiles },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AssignmentsService);
  });

  describe('offer', () => {
    it('returns 404 when the order item does not exist', async () => {
      items.findOne.mockResolvedValue(null);
      await expect(
        service.offer(999, { assistantIds: [20] }, 7, ['CUSTOMER']),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks a customer from offering on another customer order', async () => {
      items.findOne.mockResolvedValue(makeItem({ order: { customerId: 999 } as any }));
      await expect(
        service.offer(1, { assistantIds: [20] }, 7, ['CUSTOMER']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an assistant who lacks an APPROVED profile', async () => {
      items.findOne.mockResolvedValue(makeItem());
      users.findOne.mockResolvedValue({ id: 20, isActive: true });
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'PENDING' }));
      await expect(
        service.offer(1, { assistantIds: [20] }, 999, ['ADMIN']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an assistant who does not support the service type', async () => {
      items.findOne.mockResolvedValue(makeItem());
      users.findOne.mockResolvedValue({ id: 20, isActive: true });
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      profiles.findOne.mockResolvedValue(makeProfile({ services: [{ id: 9 } as ServiceType] }));
      await expect(
        service.offer(1, { assistantIds: [20] }, 999, ['ADMIN']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates offers for an eligible assistant', async () => {
      items.findOne.mockResolvedValue(makeItem());
      users.findOne.mockResolvedValue({ id: 20, isActive: true });
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      profiles.findOne.mockResolvedValue(makeProfile());
      assignments.findOne.mockResolvedValue(null);
      assignments.save.mockResolvedValue(makeAssignment());
      const result = await service.offer(1, { assistantIds: [20] }, 999, ['ADMIN']);
      expect(result).toHaveLength(1);
    });

    it('blocks offering on a completed/cancelled item', async () => {
      items.findOne.mockResolvedValue(makeItem({ status: 'COMPLETED' }));
      await expect(
        service.offer(1, { assistantIds: [20] }, 999, ['ADMIN']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('respond', () => {
    it('returns 404 when the assignment does not exist', async () => {
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      assignments.findOne.mockResolvedValue(null);
      await expect(
        service.respond(999, 20, { status: 'ACCEPTED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks responding to another assistant offer', async () => {
      assignments.findOne.mockResolvedValue(makeAssignment({ assistantId: 99 }));
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      await expect(
        service.respond(1, 20, { status: 'ACCEPTED' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateItemStatus', () => {
    it('blocks a non-assistant from updating item status', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      await expect(
        service.updateItemStatus(1, 20, { status: 'COMPLETED' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});

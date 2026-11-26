import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { FavoriteAssistant } from './entities/favorite-assistant.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { AssistantProfile } from '../assistant-profile/entities/assistant-profile.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Review } from '../review/entities/review.entity';

type RepoMock = {
  findOne: jest.Mock;
  find: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  createQueryBuilder: jest.Mock;
  remove: jest.Mock;
};

function mockRepo(): RepoMock {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (e: any) => { if (!e.id) e.id = 1; return e; }),
    create: jest.fn((values?: any) => (values ? { ...values } : ({} as any))),
    createQueryBuilder: jest.fn(() => qb),
    remove: jest.fn(),
  };
}

function role(name: string) {
  return { role: { name } } as any;
}

function makeAssistantUser(active = true): User {
  return { id: 20, fullName: 'Sami', email: 's@x.com', phone: null, isActive: active } as User;
}

function makeProfile(over: Partial<AssistantAssistant> = {}): AssistantProfile {
  return {
    id: 1,
    userId: 20,
    bio: 'driver',
    profileImageUrl: null,
    city: 'Jeddah',
    verificationStatus: 'APPROVED',
    isAvailable: true,
    services: [],
    user: makeAssistantUser(),
    ...over,
  } as AssistantProfile;
}

// alias to satisfy the helper typing
type AssistantAssistant = AssistantProfile;

describe('FavoritesService', () => {
  let service: FavoritesService;
  let favorites: RepoMock;
  let users: RepoMock;
  let userRoles: RepoMock;
  let profiles: RepoMock;
  let reviews: RepoMock;
  let serviceTypes: RepoMock;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    favorites = mockRepo();
    users = mockRepo();
    userRoles = mockRepo();
    profiles = mockRepo();
    reviews = mockRepo();
    serviceTypes = mockRepo();
    dataSource = { transaction: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: getRepositoryToken(FavoriteAssistant), useValue: favorites },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(UserRole), useValue: userRoles },
        { provide: getRepositoryToken(AssistantProfile), useValue: profiles },
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: getRepositoryToken(ServiceType), useValue: serviceTypes },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(FavoritesService);
  });

  describe('add', () => {
    const approvedAssistant = makeProfile();

    it('rejects a non-customer caller', async () => {
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects adding yourself', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      await expect(service.add(5, 5)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns 404 when the assistant does not exist', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      users.findOne.mockResolvedValue(null);
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when the target is not an assistant', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('CUSTOMER')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the assistant account is inactive', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser(false));
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the assistant has no profile', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      profiles.findOne.mockResolvedValue(null);
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the assistant is not APPROVED', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'PENDING' }));
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate favorite', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      profiles.findOne.mockResolvedValue(approvedAssistant);
      favorites.findOne.mockResolvedValue({ id: 1, customerId: 5, assistantId: 20 });
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(ConflictException);
    });

    it('handles ER_DUP_ENTRY as a conflict (concurrent dedupe)', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      profiles.findOne.mockResolvedValue(approvedAssistant);
      favorites.findOne.mockResolvedValue(null);
      favorites.save.mockRejectedValue({ code: 'ER_DUP_ENTRY' });
      await expect(service.add(5, 20)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a favorite and returns the DTO with bookable=true', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      profiles.findOne.mockResolvedValue(approvedAssistant);
      favorites.findOne.mockResolvedValue(null);
      favorites.save.mockResolvedValue({ id: 7, customerId: 5, assistantId: 20, createdAt: new Date() });
      reviews.createQueryBuilder().getRawMany.mockResolvedValue([
        { assistantId: 20, avg: '4.00', count: 3 },
      ]);
      const result = await service.add(5, 20);
      expect(result.favoriteId).toBe(7);
      expect(result.bookable).toBe(true);
      expect(result.averageRating).toBe(4);
      expect(result.reviewCount).toBe(3);
    });

    it('never exposes passwordHash or raw user object', async () => {
      userRoles.find
        .mockResolvedValueOnce([role('CUSTOMER')])
        .mockResolvedValueOnce([role('ASSISTANT')]);
      users.findOne.mockResolvedValue(makeAssistantUser());
      profiles.findOne.mockResolvedValue(approvedAssistant);
      favorites.findOne.mockResolvedValue(null);
      favorites.save.mockResolvedValue({ id: 7, customerId: 5, assistantId: 20, createdAt: new Date() });
      const result: any = await service.add(5, 20);
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('user');
    });
  });

  describe('list', () => {
    it('returns paginated favorites with grouped rating stats', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      const fav = {
        id: 7,
        customerId: 5,
        assistantId: 20,
        createdAt: new Date(),
        assistant: { ...makeAssistantUser(), assistantProfile: makeProfile() },
      };
      const qb = favorites.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[fav], 1]);
      reviews.createQueryBuilder().getRawMany.mockResolvedValue([
        { assistantId: 20, avg: '5.00', count: 1 },
      ]);
      const result = await service.list(5, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].averageRating).toBe(5);
      expect(result.data[0].reviewCount).toBe(1);
      expect(result.data[0].bookable).toBe(true);
    });
  });

  describe('remove', () => {
    it('returns 404 when the favorite does not exist', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      favorites.findOne.mockResolvedValue(null);
      await expect(service.remove(5, 20)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('removes the favorite', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      favorites.findOne.mockResolvedValue({ id: 7, customerId: 5, assistantId: 20 });
      const result = await service.remove(5, 20);
      expect(result.removed).toBe(true);
    });
  });
});

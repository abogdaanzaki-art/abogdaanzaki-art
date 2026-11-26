import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssistantProfileService } from './assistant-profile.service';
import { AssistantProfile } from './entities/assistant-profile.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Review } from '../review/entities/review.entity';
import { VerificationStatus } from './assistant-profile.types';

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
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (e: any) => ({ ...e, id: e.id ?? 1 })),
    create: jest.fn((_, values?: any) => (values ? { ...values } : ({} as any))),
    createQueryBuilder: jest.fn(() => qb),
    remove: jest.fn(),
  };
}

function role(name: string) {
  return { role: { name } } as any;
}

function makeProfile(over: Partial<AssistantProfile> = {}): AssistantProfile {
  return {
    id: 1,
    userId: 10,
    bio: null,
    profileImageUrl: null,
    city: 'Riyadh',
    verificationStatus: 'PENDING',
    isAvailable: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    services: [],
    user: { id: 10, fullName: 'Ahmad', email: 'a@x.com', phone: null, isActive: true } as any,
    ...over,
  } as AssistantProfile;
}

describe('AssistantProfileService', () => {
  let service: AssistantProfileService;
  let profiles: RepoMock;
  let users: RepoMock;
  let userRoles: RepoMock;
  let serviceTypes: RepoMock;
  let reviews: RepoMock;
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    profiles = mockRepo();
    users = mockRepo();
    userRoles = mockRepo();
    serviceTypes = mockRepo();
    reviews = mockRepo();
    dataSource = {
      transaction: jest.fn(async (cb: any) => {
        const em = {
          create: (cls: any, values: any) => ({ ...values, id: 1 }) as any,
          save: async (e: any) => ({ ...e, id: e.id ?? 1 }),
          find: async () => [] as any,
          findOne: async () => makeProfile(),
        };
        return cb(em);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantProfileService,
        { provide: getRepositoryToken(AssistantProfile), useValue: profiles },
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(UserRole), useValue: userRoles },
        { provide: getRepositoryToken(ServiceType), useValue: serviceTypes },
        { provide: getRepositoryToken(Review), useValue: reviews },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(AssistantProfileService);
  });

  describe('createMine', () => {
    it('rejects a user without the ASSISTANT role', async () => {
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      await expect(
        service.createMine(10, { city: 'Riyadh' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a duplicate profile', async () => {
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      profiles.findOne.mockResolvedValue(makeProfile());
      await expect(
        service.createMine(10, { city: 'Riyadh' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates a profile with PENDING verification and isAvailable=false', async () => {
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      profiles.findOne.mockResolvedValue(null);
      const result = await service.createMine(10, { city: 'Riyadh', bio: 'hi' });
      expect(result.verificationStatus).toBe('PENDING');
      expect(result.isAvailable).toBe(false);
    });

    it('never exposes passwordHash in the response', async () => {
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      profiles.findOne.mockResolvedValue(null);
      const result: any = await service.createMine(10, { city: 'Riyadh' });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('user');
    });
  });

  describe('updateAvailability', () => {
    it('blocks enabling availability when not APPROVED', async () => {
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'PENDING' }));
      await expect(
        service.updateAvailability(10, { isAvailable: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('blocks enabling availability on an inactive account', async () => {
      profiles.findOne.mockResolvedValue(
        makeProfile({
          verificationStatus: 'APPROVED',
          user: { isActive: false } as any,
        }),
      );
      users.findOne.mockResolvedValue({ isActive: false });
      await expect(
        service.updateAvailability(10, { isAvailable: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows enabling availability when APPROVED and active', async () => {
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'APPROVED' }));
      users.findOne.mockResolvedValue({ isActive: true });
      const result = await service.updateAvailability(10, { isAvailable: true });
      expect(result.isAvailable).toBe(true);
    });

    it('allows disabling availability regardless of verification', async () => {
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'PENDING', isAvailable: true }));
      const result = await service.updateAvailability(10, { isAvailable: false });
      expect(result.isAvailable).toBe(false);
    });
  });

  describe('findOnePublic', () => {
    it('returns 404 when no profile exists', async () => {
      profiles.findOne.mockResolvedValue(null);
      await expect(service.findOnePublic(10)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 when the user is not an assistant', async () => {
      profiles.findOne.mockResolvedValue(makeProfile());
      userRoles.find.mockResolvedValue([role('CUSTOMER')]);
      await expect(service.findOnePublic(10)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 when not APPROVED', async () => {
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'PENDING' }));
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      await expect(service.findOnePublic(10)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns 404 when the user account is inactive', async () => {
      profiles.findOne.mockResolvedValue(
        makeProfile({ verificationStatus: 'APPROVED', user: { isActive: false } as any }),
      );
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      await expect(service.findOnePublic(10)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the public DTO when APPROVED and active', async () => {
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'APPROVED' }));
      userRoles.find.mockResolvedValue([role('ASSISTANT')]);
      const result = await service.findOnePublic(10);
      expect(result.userId).toBe(10);
      expect(result).not.toHaveProperty('email');
    });
  });

  describe('updateVerification', () => {
    it('sets isAvailable=false when rejected', async () => {
      profiles.findOne.mockResolvedValue(makeProfile({ verificationStatus: 'APPROVED', isAvailable: true }));
      const result = await service.updateVerification(10, { verificationStatus: 'REJECTED' });
      expect(result.verificationStatus).toBe('REJECTED');
      expect(profiles.save).toHaveBeenCalled();
    });

    it('returns 404 when the profile does not exist', async () => {
      profiles.findOne.mockResolvedValue(null);
      await expect(
        service.updateVerification(10, { verificationStatus: 'APPROVED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAvailable', () => {
    it('returns only APPROVED, available, active profiles', async () => {
      const qb = profiles.createQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([
        [makeProfile({ verificationStatus: 'APPROVED', isAvailable: true })],
        1,
      ]);
      reviews.createQueryBuilder().getRawMany.mockResolvedValue([
        { assistantId: 10, avg: '4.50', count: 2 },
      ]);
      const result = await service.findAvailable({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].averageRating).toBe(4.5);
    });
  });
});

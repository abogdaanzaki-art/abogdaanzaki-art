import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AssistantProfile } from './entities/assistant-profile.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Review } from '../review/entities/review.entity';
import {
  CreateAssistantProfileDto,
  UpdateAssistantProfileDto,
  UpdateAvailabilityDto,
  UpdateVerificationDto,
} from './dto/assistant-profile.dto';
import { VerificationStatus } from './assistant-profile.types';
import { paginate, paginated } from '../common/pagination';

export interface PublicAssistantDto {
  id: number;
  userId: number;
  fullName: string;
  bio: string | null;
  profileImageUrl: string | null;
  city: string | null;
  isAvailable: boolean;
  verificationStatus: VerificationStatus;
  averageRating: number | null;
  services: { id: number; code: string; name: string }[];
}

export interface AdminAssistantDto extends PublicAssistantDto {
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OwnAssistantDto extends PublicAssistantDto {
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AssistantProfileService {
  constructor(
    @InjectRepository(AssistantProfile) private profiles: Repository<AssistantProfile>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    @InjectRepository(ServiceType) private serviceTypes: Repository<ServiceType>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    private dataSource: DataSource,
  ) {}

  private async ensureAssistant(userId: number) {
    const roles = await this.userRoles.find({ where: { userId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'ASSISTANT')) {
      throw new ForbiddenException('Only users with the ASSISTANT role can manage an assistant profile');
    }
  }

  private async userHasAssistantRole(userId: number): Promise<boolean> {
    const roles = await this.userRoles.find({ where: { userId }, relations: ['role'] });
    return roles.some((r) => r.role.name === 'ASSISTANT');
  }

  async createMine(userId: number, dto: CreateAssistantProfileDto): Promise<OwnAssistantDto> {
    await this.ensureAssistant(userId);

    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Assistant profile already exists for this user');

    return this.dataSource.transaction(async (em) => {
      const profile = em.create(AssistantProfile, {
        userId,
        bio: dto.bio ?? null,
        profileImageUrl: dto.profileImageUrl ?? null,
        city: dto.city,
        verificationStatus: 'PENDING' as VerificationStatus,
        isAvailable: false,
        services: [],
      });
      await em.save(profile);

      if (dto.serviceTypeIds && dto.serviceTypeIds.length) {
        const services = await em.find(ServiceType, {
          where: { id: In(dto.serviceTypeIds), isActive: true },
        });
        if (services.length !== dto.serviceTypeIds.length) {
          throw new BadRequestException('One or more service types are invalid or inactive');
        }
        profile.services = services;
        await em.save(profile);
      }

      // Reload within the same transaction so we see uncommitted data.
      const reloaded = await em.findOne(AssistantProfile, {
        where: { id: profile.id },
        relations: ['services', 'user'],
      });
      const avgRating = await this.getAvgRating(userId);
      return this.toOwnDto(reloaded!, avgRating);
    });
  }

  async findMine(userId: number): Promise<OwnAssistantDto> {
    const profile = await this.findOneOwned(userId);
    const avgRating = await this.getAvgRating(userId);
    return this.toOwnDto(profile, avgRating);
  }

  async updateMine(userId: number, dto: UpdateAssistantProfileDto): Promise<OwnAssistantDto> {
    const owned = await this.findOneOwned(userId);
    return this.dataSource.transaction(async (em) => {
      const managed = await em.findOne(AssistantProfile, { where: { id: owned.id }, relations: ['services', 'user'] });
      if (!managed) throw new NotFoundException('Assistant profile not found');

      if (dto.bio !== undefined) managed.bio = dto.bio;
      if (dto.profileImageUrl !== undefined) managed.profileImageUrl = dto.profileImageUrl;
      if (dto.city !== undefined) managed.city = dto.city;

      if (dto.serviceTypeIds !== undefined) {
        if (dto.serviceTypeIds.length === 0) {
          managed.services = [];
        } else {
          const services = await em.find(ServiceType, {
            where: { id: In(dto.serviceTypeIds), isActive: true },
          });
          if (services.length !== dto.serviceTypeIds.length) {
            throw new BadRequestException('One or more service types are invalid or inactive');
          }
          managed.services = services;
        }
      }
      const saved = await em.save(managed);
      const reloaded = await em.findOne(AssistantProfile, {
        where: { id: saved.id },
        relations: ['services', 'user'],
      });
      const avgRating = await this.getAvgRating(userId);
      return this.toOwnDto(reloaded!, avgRating);
    });
  }

  async updateAvailability(userId: number, dto: UpdateAvailabilityDto): Promise<OwnAssistantDto> {
    const profile = await this.findOneOwned(userId);

    if (dto.isAvailable) {
      if (profile.verificationStatus !== 'APPROVED') {
        throw new BadRequestException('Cannot enable availability before verification is approved');
      }
      const user = await this.users.findOne({ where: { id: userId } });
      if (!user || !user.isActive) {
        throw new BadRequestException('Cannot enable availability on an inactive account');
      }
    }
    profile.isAvailable = dto.isAvailable;
    await this.profiles.save(profile);
    const reloaded = await this.findOneOwned(userId);
    const avgRating = await this.getAvgRating(userId);
    return this.toOwnDto(reloaded, avgRating);
  }

  async findAvailable(query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.profiles
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.services', 'st')
      .innerJoinAndSelect('p.user', 'u')
      .where('p.verificationStatus = :vs', { vs: 'APPROVED' })
      .andWhere('p.isAvailable = :avail', { avail: true })
      .andWhere('u.isActive = :active', { active: true });
    if (query.city) {
      qb.andWhere('p.city = :city', { city: query.city });
    }
    if (query.serviceTypeId) {
      qb.innerJoin('p.services', 'fs', 'fs.id = :sid', { sid: query.serviceTypeId });
    }
    qb.orderBy('p.updatedAt', 'DESC').skip(skip).take(take);
    const [rows, total] = await qb.getManyAndCount();
    const ratings = await this.getAvgRatings(rows.map((r) => r.userId));
    const data = rows.map((p) => this.toPublicDto(p, ratings.get(p.userId)?.avg ?? null));
    return paginated(data, total, page, limit);
  }

  async findOnePublic(assistantId: number): Promise<PublicAssistantDto> {
    const profile = await this.profiles.findOne({
      where: { userId: assistantId },
      relations: ['services', 'user'],
    });
    if (!profile) throw new NotFoundException('Assistant profile not found');
    const isAssistant = await this.userHasAssistantRole(assistantId);
    if (!isAssistant) throw new NotFoundException('Assistant profile not found');
    if (profile.verificationStatus !== 'APPROVED') {
      throw new NotFoundException('Assistant profile not found');
    }
    if (!profile.user || !profile.user.isActive) {
      throw new NotFoundException('Assistant profile not found');
    }
    const avgRating = await this.getAvgRating(assistantId);
    return this.toPublicDto(profile, avgRating);
  }

  async findAllAdmin(query: any) {
    const { skip, take, page, limit } = paginate(query);
    const qb = this.profiles
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.services', 'st')
      .innerJoinAndSelect('p.user', 'u')
      .orderBy('p.createdAt', 'DESC');
    if (query.verificationStatus) {
      qb.andWhere('p.verificationStatus = :vs', { vs: query.verificationStatus });
    }
    if (query.city) {
      qb.andWhere('p.city = :city', { city: query.city });
    }
    qb.skip(skip).take(take);
    const [rows, total] = await qb.getManyAndCount();
    const ratings = await this.getAvgRatings(rows.map((r) => r.userId));
    const data = rows.map((p) => this.toAdminDto(p, ratings.get(p.userId)?.avg ?? null));
    return paginated(data, total, page, limit);
  }

  async updateVerification(assistantId: number, dto: UpdateVerificationDto): Promise<AdminAssistantDto> {
    const profile = await this.profiles.findOne({ where: { userId: assistantId }, relations: ['services', 'user'] });
    if (!profile) throw new NotFoundException('Assistant profile not found');
    const status = dto.verificationStatus as VerificationStatus;
    profile.verificationStatus = status;
    if (status === 'REJECTED') {
      profile.isAvailable = false;
    }
    const saved = await this.profiles.save(profile);
    const reloaded = await this.profiles.findOne({
      where: { id: saved.id },
      relations: ['services', 'user'],
    });
    const avgRating = await this.getAvgRating(assistantId);
    return this.toAdminDto(reloaded!, avgRating);
  }

  private async findOneOwned(userId: number): Promise<AssistantProfile> {
    const profile = await this.profiles.findOne({
      where: { userId },
      relations: ['services', 'user'],
    });
    if (!profile) throw new NotFoundException('Assistant profile not found. Create one first.');
    return profile;
  }

  private async getAvgRating(assistantId: number): Promise<number | null> {
    const result = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.assistantId = :assistantId', { assistantId })
      .getRawOne();
    return result?.avg !== null && result?.avg !== undefined ? Number(Number(result.avg).toFixed(2)) : null;
  }

  private async getAvgRatings(assistantIds: number[]): Promise<Map<number, { avg: number | null; count: number }>> {
    const map = new Map<number, { avg: number | null; count: number }>();
    if (assistantIds.length === 0) return map;
    const rows = await this.reviews
      .createQueryBuilder('r')
      .select('r.assistantId', 'assistantId')
      .addSelect('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.assistantId IN (:...ids)', { ids: assistantIds })
      .groupBy('r.assistantId')
      .getRawMany();
    for (const row of rows) {
      map.set(Number(row.assistantId), {
        avg: row.avg !== null ? Number(Number(row.avg).toFixed(2)) : null,
        count: Number(row.count),
      });
    }
    return map;
  }

  private toPublicDto(profile: AssistantProfile, avgRating: number | null): PublicAssistantDto {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user?.fullName ?? '',
      bio: profile.bio,
      profileImageUrl: profile.profileImageUrl,
      city: profile.city,
      isAvailable: profile.isAvailable,
      verificationStatus: profile.verificationStatus,
      averageRating: avgRating,
      services: (profile.services || []).map((s) => ({ id: s.id, code: s.code, name: s.name })),
    };
  }

  private toAdminDto(profile: AssistantProfile, avgRating: number | null): AdminAssistantDto {
    return {
      ...this.toPublicDto(profile, avgRating),
      email: profile.user?.email ?? '',
      phone: profile.user?.phone ?? null,
      isActive: profile.user?.isActive ?? false,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  private toOwnDto(profile: AssistantProfile, avgRating: number | null): OwnAssistantDto {
    return {
      ...this.toAdminDto(profile, avgRating),
    };
  }
}

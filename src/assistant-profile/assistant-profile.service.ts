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

  async createMine(userId: number, dto: CreateAssistantProfileDto) {
    await this.ensureAssistant(userId);

    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Assistant profile already exists for this user');

    return this.dataSource.transaction(async (em) => {
      const profile = em.create(AssistantProfile, {
        userId,
        bio: dto.bio,
        profileImageUrl: dto.profileImageUrl,
        city: dto.city,
        verificationStatus: 'PENDING' as VerificationStatus,
        isAvailable: true,
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
      return this.findOneOwned(userId);
    });
  }

  async findMine(userId: number) {
    return this.findOneOwned(userId);
  }

  async updateMine(userId: number, dto: UpdateAssistantProfileDto) {
    const profile = await this.findOneOwned(userId);
    return this.dataSource.transaction(async (em) => {
      const managed = await em.findOne(AssistantProfile, { where: { id: profile.id }, relations: ['services'] });
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
      return em.save(managed);
    });
  }

  async updateAvailability(userId: number, dto: UpdateAvailabilityDto) {
    const profile = await this.findOneOwned(userId);
    profile.isAvailable = dto.isAvailable;
    return this.profiles.save(profile);
  }

  /** Approved + available assistants, with optional city filter. */
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
    const [data, total] = await qb.getManyAndCount();
    return paginated(data.map((p) => this.toPublicDto(p)), total, page, limit);
  }

  /** Public view of a specific assistant. */
  async findOnePublic(assistantId: number) {
    const profile = await this.profiles.findOne({
      where: { userId: assistantId },
      relations: ['services', 'user'],
    });
    if (!profile) throw new NotFoundException('Assistant profile not found');
    const isAssistant = await this.userHasAssistantRole(assistantId);
    if (!isAssistant) throw new NotFoundException('Assistant profile not found');
    return this.toPublicDto(profile);
  }

  /** Admin: all profiles with pagination + verification filter. */
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
    const [data, total] = await qb.getManyAndCount();
    return paginated(data, total, page, limit);
  }

  async updateVerification(assistantId: number, dto: UpdateVerificationDto) {
    const profile = await this.profiles.findOne({ where: { userId: assistantId } });
    if (!profile) throw new NotFoundException('Assistant profile not found');
    const status = dto.verificationStatus as VerificationStatus;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new BadRequestException('verificationStatus must be APPROVED or REJECTED');
    }
    profile.verificationStatus = status;
    return this.profiles.save(profile);
  }

  private async findOneOwned(userId: number) {
    const profile = await this.profiles.findOne({
      where: { userId },
      relations: ['services', 'user'],
    });
    if (!profile) throw new NotFoundException('Assistant profile not found. Create one first.');
    return profile;
  }

  /** Strip sensitive fields (passwordHash) from the user relation. */
  private toPublicDto(profile: AssistantProfile) {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.user?.fullName,
      bio: profile.bio,
      profileImageUrl: profile.profileImageUrl,
      city: profile.city,
      verificationStatus: profile.verificationStatus,
      isAvailable: profile.isAvailable,
      services: (profile.services || []).map((s) => ({ id: s.id, code: s.code, name: s.name })),
    };
  }
}

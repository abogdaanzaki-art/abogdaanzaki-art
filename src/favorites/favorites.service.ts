import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FavoriteAssistant } from './entities/favorite-assistant.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { AssistantProfile } from '../assistant-profile/entities/assistant-profile.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Review } from '../review/entities/review.entity';
import { paginate, paginated } from '../common/pagination';

export interface FavoriteDto {
  favoriteId: number;
  assistantId: number;
  fullName: string;
  bio: string | null;
  profileImageUrl: string | null;
  city: string | null;
  isAvailable: boolean;
  bookable: boolean;
  averageRating: number | null;
  reviewCount: number;
  favoritedAt: Date;
  services: { id: number; code: string; name: string }[];
}

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteAssistant) private favorites: Repository<FavoriteAssistant>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    @InjectRepository(AssistantProfile) private profiles: Repository<AssistantProfile>,
    @InjectRepository(Review) private reviews: Repository<Review>,
    @InjectRepository(ServiceType) private serviceTypes: Repository<ServiceType>,
    private dataSource: DataSource,
  ) {}

  private async ensureCustomer(userId: number) {
    const roles = await this.userRoles.find({ where: { userId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'CUSTOMER')) {
      throw new ForbiddenException('Only users with the CUSTOMER role can manage favorite assistants');
    }
  }

  async add(customerId: number, assistantId: number): Promise<FavoriteDto> {
    await this.ensureCustomer(customerId);
    if (customerId === assistantId) {
      throw new BadRequestException('You cannot add yourself as a favorite');
    }

    const assistant = await this.users.findOne({ where: { id: assistantId } });
    if (!assistant) throw new NotFoundException('Assistant not found');

    const roles = await this.userRoles.find({ where: { userId: assistantId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'ASSISTANT')) {
      throw new BadRequestException('Target user is not an assistant');
    }

    if (!assistant.isActive) {
      throw new BadRequestException('Target assistant account is inactive');
    }

    const profile = await this.profiles.findOne({
      where: { userId: assistantId },
      relations: ['services'],
    });
    if (!profile) {
      throw new BadRequestException('Target user does not have an assistant profile');
    }
    if (profile.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Target assistant is not verified');
    }

    const existing = await this.favorites.findOne({ where: { customerId, assistantId } });
    if (existing) throw new ConflictException('This assistant is already in your favorites');

    const fav = this.favorites.create({ customerId, assistantId });
    let saved: FavoriteAssistant;
    try {
      saved = await this.favorites.save(fav);
    } catch (err: any) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('This assistant is already in your favorites');
      }
      throw err;
    }

    const stats = await this.getRatingStats([assistantId]);
    const stat = stats.get(assistantId) ?? { avg: null, count: 0 };
    return this.toDto(saved, assistant, profile, stat.avg, stat.count);
  }

  async list(customerId: number, query: any) {
    await this.ensureCustomer(customerId);
    const { skip, take, page, limit } = paginate(query);
    const qb = this.favorites
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.assistant', 'u')
      .leftJoinAndSelect('u.assistantProfile', 'ap')
      .leftJoinAndSelect('ap.services', 'st')
      .where('f.customerId = :customerId', { customerId })
      .orderBy('f.createdAt', 'DESC')
      .skip(skip)
      .take(take);
    const [rows, total] = await qb.getManyAndCount();

    const assistantIds = rows.map((r) => r.assistantId);
    const stats = await this.getRatingStats(assistantIds);

    const data = rows.map((f) => {
      const stat = stats.get(f.assistantId) ?? { avg: null, count: 0 };
      return this.toDto(f, f.assistant, f.assistant?.assistantProfile ?? null, stat.avg, stat.count);
    });
    return paginated(data, total, page, limit);
  }

  async remove(customerId: number, assistantId: number) {
    await this.ensureCustomer(customerId);
    const fav = await this.favorites.findOne({ where: { customerId, assistantId } });
    if (!fav) throw new NotFoundException('This assistant is not in your favorites');
    await this.favorites.remove(fav);
    return { removed: true };
  }

  private async getRatingStats(
    assistantIds: number[],
  ): Promise<Map<number, { avg: number | null; count: number }>> {
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

  private toDto(
    fav: FavoriteAssistant,
    assistant: User | null,
    profile: AssistantProfile | null,
    avgRating: number | null,
    reviewCount: number,
  ): FavoriteDto {
    const bookable =
      !!assistant &&
      assistant.isActive &&
      !!profile &&
      profile.verificationStatus === 'APPROVED' &&
      profile.isAvailable;
    return {
      favoriteId: fav.id,
      assistantId: fav.assistantId,
      fullName: assistant?.fullName ?? '',
      bio: profile?.bio ?? null,
      profileImageUrl: profile?.profileImageUrl ?? null,
      city: profile?.city ?? null,
      isAvailable: profile?.isAvailable ?? false,
      bookable,
      averageRating: avgRating,
      reviewCount,
      favoritedAt: fav.createdAt,
      services: (profile?.services ?? []).map((s) => ({ id: s.id, code: s.code, name: s.name })),
    };
  }
}

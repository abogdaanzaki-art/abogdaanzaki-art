import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FavoriteAssistant } from './entities/favorite-assistant.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { AssistantProfile } from '../assistant-profile/entities/assistant-profile.entity';
import { Review } from '../review/entities/review.entity';
import { paginate, paginated } from '../common/pagination';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteAssistant) private favorites: Repository<FavoriteAssistant>,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(UserRole) private userRoles: Repository<UserRole>,
    @InjectRepository(AssistantProfile) private profiles: Repository<AssistantProfile>,
    @InjectRepository(Review) private reviews: Repository<Review>,
  ) {}

  private async ensureCustomer(userId: number) {
    const roles = await this.userRoles.find({ where: { userId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'CUSTOMER')) {
      throw new ForbiddenException('Only users with the CUSTOMER role can manage favorite assistants');
    }
  }

  private async ensureIsAssistant(assistantId: number) {
    const roles = await this.userRoles.find({ where: { userId: assistantId }, relations: ['role'] });
    if (!roles.some((r) => r.role.name === 'ASSISTANT')) {
      throw new BadRequestException('Target user is not an assistant');
    }
  }

  async add(customerId: number, assistantId: number) {
    await this.ensureCustomer(customerId);
    if (customerId === assistantId) {
      throw new BadRequestException('You cannot add yourself as a favorite');
    }
    const assistant = await this.users.findOne({ where: { id: assistantId } });
    if (!assistant) throw new NotFoundException('Assistant not found');
    await this.ensureIsAssistant(assistantId);

    const existing = await this.favorites.findOne({ where: { customerId, assistantId } });
    if (existing) throw new ConflictException('This assistant is already in your favorites');

    const fav = this.favorites.create({ customerId, assistantId });
    await this.favorites.save(fav);
    return this.toPublicDto(fav, assistant, await this.getProfile(assistantId), await this.getAvgRating(assistantId));
  }

  async list(customerId: number, query: any) {
    await this.ensureCustomer(customerId);
    const { skip, take, page, limit } = paginate(query);
    const qb = this.favorites
      .createQueryBuilder('f')
      .innerJoinAndSelect('f.assistant', 'u')
      .leftJoinAndSelect('u.assistantProfile', 'ap')
      .where('f.customerId = :customerId', { customerId })
      .orderBy('f.createdAt', 'DESC')
      .skip(skip)
      .take(take);
    const [rows, total] = await qb.getManyAndCount();

    const enriched = await Promise.all(
      rows.map(async (f) => ({
        id: f.id,
        assistantId: f.assistantId,
        fullName: f.assistant?.fullName,
        city: f.assistant?.assistantProfile?.city ?? null,
        profileImageUrl: f.assistant?.assistantProfile?.profileImageUrl ?? null,
        isAvailable: f.assistant?.assistantProfile?.isAvailable ?? null,
        verificationStatus: f.assistant?.assistantProfile?.verificationStatus ?? null,
        averageRating: await this.getAvgRating(f.assistantId),
        favoritedAt: f.createdAt,
      })),
    );
    return paginated(enriched, total, page, limit);
  }

  async remove(customerId: number, assistantId: number) {
    await this.ensureCustomer(customerId);
    const fav = await this.favorites.findOne({ where: { customerId, assistantId } });
    if (!fav) throw new NotFoundException('This assistant is not in your favorites');
    await this.favorites.remove(fav);
    return { removed: true };
  }

  private getProfile(assistantId: number) {
    return this.profiles.findOne({ where: { userId: assistantId } });
  }

  private async getAvgRating(assistantId: number): Promise<number | null> {
    const { avg } = await this.reviews
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.assistantId = :assistantId', { assistantId })
      .getRawOne();
    return avg !== null && avg !== undefined ? Number(Number(avg).toFixed(2)) : null;
  }

  private toPublicDto(
    fav: FavoriteAssistant,
    assistant: User,
    profile: AssistantProfile | null,
    avgRating: number | null,
  ) {
    return {
      id: fav.id,
      assistantId: fav.assistantId,
      fullName: assistant.fullName,
      city: profile?.city ?? null,
      profileImageUrl: profile?.profileImageUrl ?? null,
      isAvailable: profile?.isAvailable ?? null,
      verificationStatus: profile?.verificationStatus ?? null,
      averageRating: avgRating,
      favoritedAt: fav.createdAt,
    };
  }
}

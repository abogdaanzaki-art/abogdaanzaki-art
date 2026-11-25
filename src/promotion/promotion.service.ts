import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionService } from './entities/promotion-service.entity';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';
import { PromotionType } from './promotion.types';

@Injectable()
export class PromotionServiceService {
  constructor(
    @InjectRepository(Promotion) private promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionService) private psRepo: Repository<PromotionService>,
    private dataSource: DataSource,
  ) {}

  findActive() {
    const now = new Date();
    return this.promoRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.services', 'ps')
      .leftJoinAndSelect('ps.serviceType', 'st')
      .where('p.isActive = true')
      .andWhere('(p.startsAt IS NULL OR p.startsAt <= :now)')
      .andWhere('(p.endsAt IS NULL OR p.endsAt >= :now)')
      .setParameter('now', now)
      .getMany();
  }

  findAll() {
    return this.promoRepo.find({ relations: ['services', 'services.serviceType'] });
  }

  async findOne(id: number) {
    const p = await this.promoRepo.findOne({ where: { id }, relations: ['services', 'services.serviceType'] });
    if (!p) throw new NotFoundException('Promotion not found');
    return p;
  }

  async create(dto: CreatePromotionDto) {
    return this.dataSource.transaction(async (em) => {
      const promo = em.create(Promotion, {
        name: dto.name,
        type: dto.type as PromotionType,
        minServices: dto.minServices ?? 2,
        discountValue: dto.discountValue ?? 10,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: true,
        services: [],
      });
      await em.save(promo);
      if (dto.services && dto.services.length) {
        for (const s of dto.services) {
          await em.save(
            em.create(PromotionService, {
              promotionId: promo.id,
              serviceTypeId: s.serviceTypeId,
              specialPrice: s.specialPrice,
            }),
          );
        }
      }
      return this.findOne(promo.id);
    });
  }

  async update(id: number, dto: UpdatePromotionDto) {
    return this.dataSource.transaction(async (em) => {
      const promo = await this.findOne(id);
      if (dto.name !== undefined) promo.name = dto.name;
      if (dto.isActive !== undefined) promo.isActive = dto.isActive;
      if (dto.startsAt !== undefined) promo.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
      if (dto.endsAt !== undefined) promo.endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
      await em.save(promo);
      if (dto.services) {
        await em.delete(PromotionService, { promotionId: id });
        for (const s of dto.services) {
          await em.save(
            em.create(PromotionService, {
              promotionId: id,
              serviceTypeId: s.serviceTypeId,
              specialPrice: s.specialPrice,
            }),
          );
        }
      }
      return this.findOne(id);
    });
  }

  async toggle(id: number, isActive: boolean) {
    const p = await this.findOne(id);
    p.isActive = isActive;
    return this.promoRepo.save(p);
  }
}

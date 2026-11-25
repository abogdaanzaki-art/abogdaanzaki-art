import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { PromotionService } from './entities/promotion-service.entity';
import { PromotionServiceService } from './promotion.service';
import { PromotionController } from './promotion.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, PromotionService])],
  providers: [PromotionServiceService],
  controllers: [PromotionController],
  exports: [PromotionServiceService],
})
export class PromotionModule {}

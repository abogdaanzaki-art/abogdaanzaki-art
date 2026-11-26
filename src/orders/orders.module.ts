import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemAssignment } from './entities/order-item-assignment.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Promotion } from '../promotion/entities/promotion.entity';
import { PromotionService } from '../promotion/entities/promotion-service.entity';
import { Address } from '../address/entities/address.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { AssistantProfile } from '../assistant-profile/entities/assistant-profile.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemAssignment,
      ServiceType,
      Promotion,
      PromotionService,
      Address,
      User,
      UserRole,
      AssistantProfile,
    ]),
  ],
  providers: [OrdersService, AssignmentsService, PricingService],
  controllers: [OrdersController, AssignmentsController],
  exports: [OrdersService, AssignmentsService, PricingService],
})
export class OrdersModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantProfile } from './entities/assistant-profile.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../roles/entities/user-role.entity';
import { ServiceType } from '../service-type/entities/service-type.entity';
import { Review } from '../review/entities/review.entity';
import { AssistantProfileService } from './assistant-profile.service';
import { AssistantProfileController } from './assistant-profile.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssistantProfile, User, UserRole, ServiceType, Review])],
  providers: [AssistantProfileService],
  controllers: [AssistantProfileController],
  exports: [AssistantProfileService],
})
export class AssistantProfileModule {}

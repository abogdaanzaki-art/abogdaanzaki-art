import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ServiceTypeModule } from './service-type/service-type.module';
import { AddressModule } from './address/address.module';
import { PromotionModule } from './promotion/promotion.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { ReviewModule } from './review/review.module';
import { AssistantProfileModule } from './assistant-profile/assistant-profile.module';
import { FavoritesModule } from './favorites/favorites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') || '3306', 10),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        charset: 'utf8mb4',
        timezone: 'Z',
        autoLoadEntities: true,
        synchronize: false,
        migrations: ['dist/migrations/*.js'],
        migrationsRun: false,
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    ServiceTypeModule,
    AddressModule,
    PromotionModule,
    OrdersModule,
    PaymentModule,
    ReviewModule,
    AssistantProfileModule,
    FavoritesModule,
  ],
})
export class AppModule {}

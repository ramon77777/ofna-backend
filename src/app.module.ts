import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import socketConfig from './config/socket.config';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommissionEntity } from './modules/commissions/entities/commission.entity';
import { MatchingModule } from './modules/matching/matching.module';
import { MissionStatusHistoryEntity } from './modules/mission-status-history/entities/mission-status-history.entity';
import { MissionStatusHistoryModule } from './modules/mission-status-history/mission-status-history.module';
import { MissionEntity } from './modules/missions/entities/mission.entity';
import { MissionsModule } from './modules/missions/missions.module';
import { NotificationEntity } from './modules/notifications/entities/notification.entity';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrderEntity } from './modules/orders/entities/order.entity';
import { PartnerDocumentEntity } from './modules/partner-documents/entities/partner-document.entity';
import { PartnerDocumentsModule } from './modules/partner-documents/partner-documents.module';
import { PartnerProfileEntity } from './modules/partners/entities/partner-profile.entity';
import { PartnersModule } from './modules/partners/partners.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductEntity } from './modules/products/entities/product.entity';
import { ReviewEntity } from './modules/reviews/entities/review.entity';
import { SystemSettingEntity } from './modules/settings/entities/system-setting.entity';
import { SupportTicketEntity } from './modules/support/entities/support-ticket.entity';
import { UserEntity } from './modules/users/entities/user.entity';
import { UsersModule } from './modules/users/users.module';
import { WalletRechargesModule } from './modules/wallet-recharges/wallet-recharges.module';
import { WalletRechargeEntity } from './modules/wallet-recharges/entities/wallet-recharge.entity';
import { WalletEntity } from './modules/wallets/entities/wallet.entity';
import { WalletsModule } from './modules/wallets/wallets.module';
import { RealtimeModule } from './gateways/realtime/realtime.module';
import { WalletTransactionsModule } from './modules/wallet-transactions/wallet-transactions.module';
import { WalletTransactionEntity } from './modules/wallet-transactions/entities/wallet-transaction.entity';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { PasswordResetTokenEntity } from './modules/auth/entities/password-reset-token.entity';

import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';

import { ReviewsModule } from './modules/reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, socketConfig],
      envFilePath: ['.env'],
      cache: true,
      expandVariables: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [
          UserEntity,
          PasswordResetTokenEntity,
          PartnerProfileEntity,
          PartnerDocumentEntity,
          WalletEntity,
          WalletRechargeEntity,
          MissionEntity,
          MissionStatusHistoryEntity,
          CommissionEntity,
          ProductEntity,
          OrderEntity,
          ReviewEntity,
          SupportTicketEntity,
          NotificationEntity,
          SystemSettingEntity,
          WalletTransactionEntity,
        ],
        synchronize: false,
        logging: configService.get<boolean>('database.logging', false),
        timezone: 'UTC',
      }),
    }),

    UsersModule,
    PartnersModule,
    WalletsModule,
    PartnerDocumentsModule,
    WalletRechargesModule,
    AuthModule,
    MissionStatusHistoryModule,
    MissionsModule,
    NotificationsModule,
    AdminModule,
    PaymentsModule,
    ProductsModule,
    OrdersModule,
    ReviewsModule,
    MatchingModule,
    RealtimeModule,
    WalletTransactionsModule,
    CommissionsModule,
  ],
})
export class AppModule {}

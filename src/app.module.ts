import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TrucksModule } from './modules/trucks/trucks.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { StorageModule } from './modules/storage/storage.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { QueueModule } from './modules/queue/queue.module';
import { AuthModule } from './modules/auths/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClaimRequestsModule } from './modules/claim-requests/claim-requests.module';

import { User } from './entities/user.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { UserSession } from './entities/user-session.entity';
import { VehicleCondition } from './entities/vehicle-condition.entity';
import { VehicleConditionModule } from './modules/vehicle-condition/vehicle-condition.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<number>('DB_PORT')) || 5432,
        username: config.get<string>('DB_USERNAME'), //  FIXED
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),

        autoLoadEntities: true,
        synchronize: false,

        extra: {
          ssl: {
            rejectUnauthorized: false,
          },
        },
      }),
    }),

    UsersModule,
    AuthModule,
    TrucksModule,
    InvoicesModule,
    StorageModule,
    PdfModule,
    QueueModule,
    ClaimRequestsModule,
    VehicleConditionModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { TrucksModule } from './modules/trucks/trucks.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { StorageModule } from './modules/storage/storage.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    UsersModule,
    TrucksModule,
    InvoicesModule,
    StorageModule,
    PdfModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

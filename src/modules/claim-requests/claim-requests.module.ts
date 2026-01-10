import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimRequestsController } from './claim-requests.controller';
import { ClaimRequestsService } from './claim-requests.service';
import { ClaimRequest } from '../../entities/claim-request.entity';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClaimRequest, Invoice, Truck]),
    StorageModule,
  ],
  controllers: [ClaimRequestsController],
  providers: [ClaimRequestsService],
  exports: [ClaimRequestsService],
})
export class ClaimRequestsModule {}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimRequestsController } from './claim-requests.controller';
import { ClaimRequestsService } from './claim-requests.service';
import { ClaimRequest } from '../../entities/claim-request.entity';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { PdfModule } from '../pdf/pdf.module';
import { ClaimFormPdfProcessor } from '../queue/processors/claim-form-pdf.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClaimRequest, Invoice, Truck]),
    StorageModule,
    QueueModule,
    PdfModule,
  ],
  controllers: [ClaimRequestsController],
  providers: [ClaimRequestsService, ClaimFormPdfProcessor],
  exports: [ClaimRequestsService],
})
export class ClaimRequestsModule {}




import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { PdfModule } from '../pdf/pdf.module';
import { InvoicePdfProcessor } from '../queue/processors/invoice-pdf.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Truck]),
    StorageModule,
    QueueModule,
    PdfModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfProcessor],
  exports: [InvoicesService],
})
export class InvoicesModule {}


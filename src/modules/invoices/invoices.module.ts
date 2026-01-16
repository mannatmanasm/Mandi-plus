import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { User } from '../../entities/user.entity';
import { StorageModule } from '../storage/storage.module';
import { QueueModule } from '../queue/queue.module';
import { PdfModule } from '../pdf/pdf.module';
import { InvoicePdfProcessor } from '../queue/processors/invoice-pdf.processor';
import { ChatraceService } from './chatrace.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Truck, User]),
    StorageModule,
    QueueModule,
    PdfModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfProcessor, ChatraceService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

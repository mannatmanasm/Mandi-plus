import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../../../entities/invoice.entity';
import { PdfService } from '../../pdf/pdf.service';
import { StorageService } from '../../storage/storage.service';

interface InvoicePdfJobData {
  invoiceId: string;
}

@Processor('invoice-pdf')
@Injectable()
export class InvoicePdfProcessor extends WorkerHost {
  private readonly logger = new Logger(InvoicePdfProcessor.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<InvoicePdfJobData>): Promise<void> {
    const { invoiceId } = job.data;

    this.logger.log(`Processing PDF generation for invoice ${invoiceId}`);

    try {
      // Fetch invoice with truck relation
      const invoice = await this.invoiceRepository.findOne({
        where: { id: invoiceId },
        relations: ['truck'],
      });

      if (!invoice) {
        this.logger.warn(`Invoice ${invoiceId} no longer exists. Skipping job.`);
        return;
      }

      // Generate PDF
      const pdfBuffer = await this.pdfService.generateInvoicePdf(
        invoice,
        invoice.weighmentSlipUrls || [],
      );

      // Upload PDF to storage
      const pdfFilename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
      const pdfUrl = await this.storageService.uploadPdf(
        pdfBuffer,
        pdfFilename,
        'invoice-pdfs',
      );

      // Update invoice with PDF URL
      invoice.pdfUrl = pdfUrl;
      await this.invoiceRepository.save(invoice);

      this.logger.log(`PDF generated and uploaded for invoice ${invoiceId}: ${pdfUrl}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF for invoice ${invoiceId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}


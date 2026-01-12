import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ClaimRequest } from '../../../entities/claim-request.entity';
import { Invoice } from '../../../entities/invoice.entity';
import { PdfService } from '../../pdf/pdf.service';
import { StorageService } from '../../storage/storage.service';

interface ClaimFormPdfJobData {
  claimRequestId: string;
  damageCertificateDate: string;
  transportReceiptMemoNo: string;
  transportReceiptDate: string;
  loadedWeightKg: number;
  productName: string;
  fromParty: string;
  forParty: string;
  accidentDate: string;
  accidentLocation: string;
  accidentDescription: string;
  agreedDamageAmountNumber?: number;
  agreedDamageAmountWords?: string;
  authorizedSignatoryName?: string;
}

@Processor('claim-form-pdf')
@Injectable()
export class ClaimFormPdfProcessor extends WorkerHost {
  private readonly logger = new Logger(ClaimFormPdfProcessor.name);

  constructor(
    @InjectRepository(ClaimRequest)
    private readonly claimRequestRepository: Repository<ClaimRequest>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    private readonly pdfService: PdfService,
    private readonly storageService: StorageService,
  ) {
    super();
  }

  async process(job: Job<ClaimFormPdfJobData>): Promise<void> {
    const { claimRequestId } = job.data;

    this.logger.log(
      `Processing damage certificate PDF for claim request ${claimRequestId}`,
    );

    try {
      const claimRequest = await this.claimRequestRepository.findOne({
        where: { id: claimRequestId },
        relations: ['invoice', 'invoice.truck', 'invoice.user'],
      });

      if (!claimRequest) {
        this.logger.warn(
          `ClaimRequest ${claimRequestId} no longer exists. Skipping job.`,
        );
        return;
      }

      const invoice = claimRequest.invoice;

      // Generate PDF buffer using PdfService
      const pdfBuffer = await this.pdfService.generateDamageCertificatePdf({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        truckNumber: invoice.truck?.truckNumber || '',
        userMobileNumber: invoice.user?.mobileNumber || '',
        ...job.data,
      });

      const filename = `damage-certificate-${invoice.invoiceNumber}-${Date.now()}.pdf`;

      const pdfUrl = await this.storageService.uploadPdf(
        pdfBuffer,
        filename,
        'claim-forms',
      );

      claimRequest.claimFormUrl = pdfUrl;
      await this.claimRequestRepository.save(claimRequest);

      this.logger.log(
        `Damage certificate PDF generated for claim request ${claimRequestId}: ${pdfUrl}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to generate damage certificate PDF for claim request ${claimRequestId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}



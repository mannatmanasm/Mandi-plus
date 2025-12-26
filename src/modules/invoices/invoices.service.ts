import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Truck)
    private readonly truckRepository: Repository<Truck>,
    @InjectQueue('invoice-pdf')
    private readonly invoicePdfQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  async create(
    createInvoiceDto: CreateInvoiceDto,
    weighmentSlipFiles?: any,
  ): Promise<Invoice> {
    // Check if invoice number already exists
    const existingInvoice = await this.invoiceRepository.findOne({
      where: { invoiceNumber: createInvoiceDto.invoiceNumber },
    });

    if (existingInvoice) {
      throw new ConflictException('Invoice with this number already exists');
    }

    // Handle truck by truck number - create if doesn't exist
    let truck: Truck | null = null;
    if (createInvoiceDto.truckNumber) {
      truck = await this.truckRepository.findOne({
        where: { truckNumber: createInvoiceDto.truckNumber },
      });

      if (!truck) {
        // Create a new truck with the truck number
        // Using minimal required fields with default values
        const newTruck = this.truckRepository.create({
          truckNumber: createInvoiceDto.truckNumber,
          ownerName: 'Unknown', // Default value, should be updated later
          ownerContactNumber: '0000000000', // Default value, should be updated later
          driverName: 'Unknown', // Default value, should be updated later
          driverContactNumber: '0000000000', // Default value, should be updated later
        });
        truck = await this.truckRepository.save(newTruck);
      }
    }

    // Upload weighment slip files if provided
    let weighmentSlipUrls;
    console.log('Weighment Slip Files:', weighmentSlipFiles);
    if (weighmentSlipFiles) {
      weighmentSlipUrls = await this.storageService.uploadMultipleFilesObj(
        weighmentSlipFiles,
        'weighment-slips',
      );
    }

    console.log('Weighment Slip URLs:', weighmentSlipUrls);

    // Create invoice - handle productName array conversion to JSON string
    // Note: Database stores productName as varchar, so we JSON stringify the array
    const invoiceData: any = {
      invoiceNumber: createInvoiceDto.invoiceNumber,
      invoiceDate: new Date(createInvoiceDto.invoiceDate),
      terms: createInvoiceDto.terms || null,
      supplierName: createInvoiceDto.supplierName,
      supplierAddress: createInvoiceDto.supplierAddress,
      placeOfSupply: createInvoiceDto.placeOfSupply,
      billToName: createInvoiceDto.billToName,
      billToAddress: createInvoiceDto.billToAddress,
      shipToName: createInvoiceDto.shipToName,
      shipToAddress: createInvoiceDto.shipToAddress,
      productName: JSON.stringify(createInvoiceDto.productName), // Store array as JSON string
      hsnCode: createInvoiceDto.hsnCode || null,
      quantity: createInvoiceDto.quantity,
      rate: createInvoiceDto.rate,
      amount: createInvoiceDto.amount,
      vehicleNumber: createInvoiceDto.vehicleNumber || null,
      weighmentSlipNote: createInvoiceDto.weighmentSlipNote || null,
      weighmentSlipUrls:
        weighmentSlipUrls.length > 0 ? weighmentSlipUrls : null,
      isClaim: createInvoiceDto.isClaim || false,
      claimDetails: createInvoiceDto.claimDetails || null,
    };

    if (truck) {
      invoiceData.truck = truck;
    }

    const invoice = this.invoiceRepository.create(invoiceData);
    const saveResult = await this.invoiceRepository.save(invoice);
    const savedInvoice = (
      Array.isArray(saveResult) ? saveResult[0] : saveResult
    ) as Invoice;

    // Queue PDF generation job
    await this.invoicePdfQueue.add('generate-pdf', {
      invoiceId: savedInvoice.id,
    });

    // Increment claim count if it's a claim invoice
    if (savedInvoice.isClaim && truck) {
      await this.truckRepository.increment({ id: truck.id }, 'claimCount', 1);
    }

    return savedInvoice;
  }

  async findAll(): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['truck'],
    });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['truck'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return await this.invoiceRepository.findOne({
      where: { invoiceNumber },
      relations: ['truck'],
    });
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    weighmentSlipFiles?: Express.Multer.File[],
  ): Promise<Invoice> {
    const invoice = await this.findOne(id);

    // Check if invoice number is being updated and conflicts
    if (
      updateInvoiceDto.invoiceNumber &&
      updateInvoiceDto.invoiceNumber !== invoice.invoiceNumber
    ) {
      const existingInvoice = await this.invoiceRepository.findOne({
        where: { invoiceNumber: updateInvoiceDto.invoiceNumber },
      });

      if (existingInvoice) {
        throw new ConflictException('Invoice with this number already exists');
      }
    }

    // Handle truck by truck number if being updated - create if doesn't exist
    if (updateInvoiceDto.truckNumber) {
      let truck = await this.truckRepository.findOne({
        where: { truckNumber: updateInvoiceDto.truckNumber },
      });

      if (!truck) {
        // Create a new truck with the truck number
        // Using minimal required fields with default values
        const newTruck = this.truckRepository.create({
          truckNumber: updateInvoiceDto.truckNumber,
        });
        truck = await this.truckRepository.save(newTruck);
      }

      invoice.truck = truck;
    }

    // Upload new weighment slip files if provided
    if (weighmentSlipFiles && weighmentSlipFiles.length > 0) {
      const newUrls = await this.storageService.uploadMultipleFiles(
        weighmentSlipFiles,
        'weighment-slips',
      );

      // Merge with existing URLs
      const existingUrls = invoice.weighmentSlipUrls || [];
      invoice.weighmentSlipUrls = [...existingUrls, ...newUrls];
    }

    // Update invoice fields - handle productName conversion if provided
    // Remove truckNumber from updateData since we handle it separately above
    const { truckNumber, ...restUpdateData } = updateInvoiceDto;
    const updateData: any = { ...restUpdateData };

    if (updateData.invoiceDate) {
      updateData.invoiceDate = new Date(updateData.invoiceDate);
    }

    if (updateData.productName && Array.isArray(updateData.productName)) {
      updateData.productName = JSON.stringify(updateData.productName);
    }

    Object.assign(invoice, updateData);
    const updatedInvoice = await this.invoiceRepository.save(invoice);

    // Queue PDF regeneration
    await this.invoicePdfQueue.add('generate-pdf', {
      invoiceId: updatedInvoice.id,
    });

    return updatedInvoice;
  }

  async remove(id: string): Promise<void> {
    const invoice = await this.findOne(id);
    await this.invoiceRepository.remove(invoice);
  }
}

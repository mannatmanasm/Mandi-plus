import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bullmq';

import { Queue } from 'bullmq';
import { Repository, Like } from 'typeorm';
import { Invoice } from '../../entities/invoice.entity';
import { Truck } from '../../entities/truck.entity';
import { User } from '../../entities/user.entity';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectQueue('invoice-pdf')
    private readonly invoicePdfQueue: Queue,
    private readonly storageService: StorageService,
  ) {}

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const lastInvoice = await this.invoiceRepository.findOne({
      where: {
        invoiceNumber: Like(`INV-${year}-%`),
      },
      order: {
        createdAt: 'DESC',
      },
    });

    let nextSeq = 1;

    if (lastInvoice) {
      const lastNumber = lastInvoice.invoiceNumber.split('-').pop();
      nextSeq = Number(lastNumber) + 1;
    }

    return `INV-${year}-${String(nextSeq).padStart(6, '0')}`;
  }

  async create(
    createInvoiceDto: CreateInvoiceDto,
    weighmentSlipFiles?: any,
  ): Promise<Invoice> {
    // 1. Validate user
    const user = await this.userRepository.findOne({
      where: { id: createInvoiceDto.userId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${createInvoiceDto.userId} not found`,
      );
    }

    // 2. Generate invoice number (AUTO)
    const invoiceNumber = await this.generateInvoiceNumber();

    // 3. Handle truck
    let truck: Truck | null = null;
    if (createInvoiceDto.truckNumber) {
      truck = await this.truckRepository.findOne({
        where: { truckNumber: createInvoiceDto.truckNumber },
      });

      if (!truck) {
        truck = await this.truckRepository.save(
          this.truckRepository.create({
            truckNumber: createInvoiceDto.truckNumber,
            ownerName: 'Unknown',
            ownerContactNumber: '0000000000',
            driverName: 'Unknown',
            driverContactNumber: '0000000000',
          }),
        );
      }
    }

    // 4. Upload weighment slips
    let weighmentSlipUrls: string[] | null = null;
    if (weighmentSlipFiles) {
      const uploaded = await this.storageService.uploadMultipleFilesObj(
        weighmentSlipFiles,
        'weighment-slips',
      );

      weighmentSlipUrls = uploaded?.length ? uploaded : null;
    }

    // 5. Normalize product name
    const productName = Array.isArray(createInvoiceDto.productName)
      ? createInvoiceDto.productName[0]
      : createInvoiceDto.productName;

    // 6. Create invoice entity
    const invoiceData: Partial<Invoice> = {
      user,
      invoiceNumber,
      invoiceDate: new Date(createInvoiceDto.invoiceDate),
      terms: createInvoiceDto.terms || null,

      supplierName: createInvoiceDto.supplierName,
      supplierAddress: createInvoiceDto.supplierAddress,
      placeOfSupply: createInvoiceDto.placeOfSupply,

      billToName: createInvoiceDto.billToName,
      billToAddress: createInvoiceDto.billToAddress,
      shipToName: createInvoiceDto.shipToName,
      shipToAddress: createInvoiceDto.shipToAddress,

      productName,
      hsnCode: createInvoiceDto.hsnCode || null,
      quantity: createInvoiceDto.quantity,
      rate: createInvoiceDto.rate,
      amount: createInvoiceDto.amount,

      vehicleNumber: createInvoiceDto.vehicleNumber || null,
      weighmentSlipNote: createInvoiceDto.weighmentSlipNote || null,
      weighmentSlipUrls,

      isClaim: createInvoiceDto.isClaim || false,
      claimDetails: createInvoiceDto.claimDetails || null,

      ownerName: createInvoiceDto.ownerName || truck?.ownerName || null,
    };

    if (truck) {
      invoiceData.truck = truck;
    }

    const invoice = this.invoiceRepository.create(invoiceData);

    // 7. Save with retry protection
    let savedInvoice: Invoice;
    try {
      savedInvoice = await this.invoiceRepository.save(invoice);
    } catch (err: any) {
      if (err.code === '23505') {
        invoice.invoiceNumber = await this.generateInvoiceNumber();
        savedInvoice = await this.invoiceRepository.save(invoice);
      } else {
        throw err;
      }
    }

    // 8. Queue PDF generation
    await this.invoicePdfQueue.add('generate-pdf', {
      invoiceId: savedInvoice.id,
    });

    // 9. Increment claim count
    if (savedInvoice.isClaim && truck) {
      await this.truckRepository.increment({ id: truck.id }, 'claimCount', 1);
    }

    return savedInvoice;
  }

  async findAll(): Promise<Invoice[]> {
    return await this.invoiceRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['truck', 'user'],
    });
  }

  async findByUserId(userId: string): Promise<Invoice[]> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return await this.invoiceRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      relations: ['truck', 'user'],
    });
  }

  async findOne(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['truck', 'user'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async findByInvoiceNumber(invoiceNumber: string): Promise<Invoice | null> {
    return await this.invoiceRepository.findOne({
      where: { invoiceNumber },
      relations: ['truck', 'user'],
    });
  }

  async update(
    id: string,
    updateInvoiceDto: UpdateInvoiceDto,
    weighmentSlipFiles?: Express.Multer.File[],
  ): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['truck'],
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    /* ===============================
     1. HANDLE TRUCK UPDATE
     =============================== */
    if (updateInvoiceDto.truckNumber) {
      let truck = await this.truckRepository.findOne({
        where: { truckNumber: updateInvoiceDto.truckNumber },
      });

      if (!truck) {
        truck = await this.truckRepository.save(
          this.truckRepository.create({
            truckNumber: updateInvoiceDto.truckNumber,
            ownerName: 'Unknown',
            ownerContactNumber: '0000000000',
            driverName: 'Unknown',
            driverContactNumber: '0000000000',
          }),
        );
      }

      invoice.truck = truck;
    }

    /* ===============================
     2. UPLOAD WEIGHMENT SLIPS
     =============================== */
    if (weighmentSlipFiles && weighmentSlipFiles.length > 0) {
      const newUrls = await this.storageService.uploadMultipleFiles(
        weighmentSlipFiles,
        'weighment-slips',
      );

      invoice.weighmentSlipUrls = [
        ...(invoice.weighmentSlipUrls || []),
        ...newUrls,
      ];
    }

    /* ===============================
     3. PREPARE UPDATE DATA
     =============================== */
    const {
      truckNumber, // handled separately
      invoiceNumber, // ❌ should never be updated
      ...rest
    } = updateInvoiceDto as any;

    if (rest.invoiceDate) {
      rest.invoiceDate = new Date(rest.invoiceDate);
    }

    if (rest.productName && Array.isArray(rest.productName)) {
      rest.productName = rest.productName[0];
    }

    /* ===============================
     4. APPLY UPDATES
     =============================== */
    Object.assign(invoice, rest);

    const updatedInvoice = await this.invoiceRepository.save(invoice);

    /* ===============================
     5. REGENERATE PDF
     =============================== */
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

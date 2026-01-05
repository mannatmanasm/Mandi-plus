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
import { InvoiceType } from '../../common/enums/invoice-type.enum';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { ExportInvoicesDto } from './dto/export-invoices.dto';
import * as ExcelJS from 'exceljs';

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
      invoiceType: createInvoiceDto.invoiceType || InvoiceType.SUPPLIER_INVOICE,

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

  /**
   * Filter invoices based on various criteria for admin dashboard
   */
  async filterInvoices(filterDto: FilterInvoicesDto): Promise<Invoice[]> {
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.truck', 'truck')
      .leftJoinAndSelect('invoice.user', 'user');

    // Filter by invoice type
    if (filterDto.invoiceType) {
      queryBuilder.andWhere('invoice.invoiceType = :invoiceType', {
        invoiceType: filterDto.invoiceType,
      });
    }

    // Filter by date range (using createdAt for date-time filtering)
    if (filterDto.startDate || filterDto.endDate) {
      if (filterDto.startDate && filterDto.endDate) {
        queryBuilder.andWhere(
          'invoice.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate: new Date(filterDto.startDate),
            endDate: new Date(filterDto.endDate),
          },
        );
      } else if (filterDto.startDate) {
        queryBuilder.andWhere('invoice.createdAt >= :startDate', {
          startDate: new Date(filterDto.startDate),
        });
      } else if (filterDto.endDate) {
        queryBuilder.andWhere('invoice.createdAt <= :endDate', {
          endDate: new Date(filterDto.endDate),
        });
      }
    }

    // Filter by supplier name (partial match, case-insensitive)
    if (filterDto.supplierName) {
      queryBuilder.andWhere('invoice.supplierName ILIKE :supplierName', {
        supplierName: `%${filterDto.supplierName}%`,
      });
    }

    // Filter by buyer name (billToName, partial match, case-insensitive)
    if (filterDto.buyerName) {
      queryBuilder.andWhere('invoice.billToName ILIKE :buyerName', {
        buyerName: `%${filterDto.buyerName}%`,
      });
    }

    // Filter by user ID
    if (filterDto.userId) {
      queryBuilder.andWhere('invoice.userId = :userId', {
        userId: filterDto.userId,
      });
    }

    queryBuilder.orderBy('invoice.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Export filtered invoices to Excel
   */
  async exportInvoicesToExcel(exportDto: ExportInvoicesDto): Promise<Buffer> {
    let invoices: Invoice[];

    // If specific invoice IDs are provided, use those (ignore date range)
    if (exportDto.invoiceIds && exportDto.invoiceIds.length > 0) {
      invoices = await this.invoiceRepository.find({
        where: exportDto.invoiceIds.map((id) => ({ id })),
        relations: ['truck', 'user'],
        order: { createdAt: 'DESC' },
      });
    } else {
      // Otherwise, filter by date range and invoice type
      // Validate that dates are provided when not using invoiceIds
      if (!exportDto.startDate || !exportDto.endDate) {
        throw new Error(
          'startDate and endDate are required when invoiceIds are not provided',
        );
      }

      const filterDto: FilterInvoicesDto = {
        invoiceType: exportDto.invoiceType,
        startDate: exportDto.startDate,
        endDate: exportDto.endDate,
      };
      invoices = await this.filterInvoices(filterDto);
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Invoices');

    // Define columns
    worksheet.columns = [
      { header: 'Invoice Number', key: 'invoiceNumber', width: 20 },
      { header: 'Invoice Date', key: 'invoiceDate', width: 15 },
      { header: 'Invoice Type', key: 'invoiceType', width: 18 },
      { header: 'Supplier Name', key: 'supplierName', width: 25 },
      { header: 'Buyer Name (Bill To)', key: 'billToName', width: 25 },
      { header: 'Ship To Name', key: 'shipToName', width: 25 },
      { header: 'Product Name', key: 'productName', width: 20 },
      { header: 'HSN Code', key: 'hsnCode', width: 12 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Rate', key: 'rate', width: 12 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Vehicle Number', key: 'vehicleNumber', width: 18 },
      { header: 'Truck Number', key: 'truckNumber', width: 18 },
      { header: 'Owner Name', key: 'ownerName', width: 20 },
      { header: 'User Name', key: 'userName', width: 20 },
      { header: 'User Mobile', key: 'userMobile', width: 15 },
      { header: 'Is Claim', key: 'isClaim', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 20 },
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    invoices.forEach((invoice) => {
      worksheet.addRow({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate
          ? new Date(invoice.invoiceDate).toLocaleDateString()
          : '',
        invoiceType: invoice.invoiceType,
        supplierName: invoice.supplierName,
        billToName: invoice.billToName,
        shipToName: invoice.shipToName,
        productName: Array.isArray(invoice.productName)
          ? invoice.productName.join(', ')
          : invoice.productName,
        hsnCode: invoice.hsnCode || '',
        quantity: invoice.quantity,
        rate: invoice.rate,
        amount: invoice.amount,
        vehicleNumber: invoice.vehicleNumber || '',
        truckNumber: invoice.truck?.truckNumber || '',
        ownerName: invoice.ownerName || '',
        userName: invoice.user?.name || '',
        userMobile: invoice.user?.mobileNumber || '',
        isClaim: invoice.isClaim ? 'Yes' : 'No',
        createdAt: invoice.createdAt
          ? new Date(invoice.createdAt).toLocaleString()
          : '',
      });
    });

    // Format amount column as currency
    worksheet.getColumn('amount').numFmt = '#,##0.00';
    worksheet.getColumn('rate').numFmt = '#,##0.00';
    worksheet.getColumn('quantity').numFmt = '#,##0.00';

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

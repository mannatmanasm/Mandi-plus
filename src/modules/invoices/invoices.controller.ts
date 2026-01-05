import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  UsePipes,
  Query,
  Res,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ParseFormDataPipe } from '../../common/pipes/parse-form-data.pipe';
import { FilterInvoicesDto } from './dto/filter-invoices.dto';
import { ExportInvoicesDto } from './dto/export-invoices.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FilesInterceptor('weighmentSlips', 10))
  @UsePipes(new ParseFormDataPipe())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          format: 'uuid',
          description: 'User ID who owns this invoice',
        },
        invoiceDate: { type: 'string', format: 'date' },
        terms: { type: 'string', nullable: true },
        supplierName: { type: 'string' },
        supplierAddress: { type: 'array', items: { type: 'string' } },
        placeOfSupply: { type: 'string' },
        billToName: { type: 'string' },
        billToAddress: { type: 'array', items: { type: 'string' } },
        shipToName: { type: 'string' },
        shipToAddress: { type: 'array', items: { type: 'string' } },
        productName: { type: 'array', items: { type: 'string' } },
        hsnCode: { type: 'string', nullable: true },
        quantity: { type: 'number' },
        rate: { type: 'number' },
        amount: { type: 'number' },
        truckNumber: { type: 'string', nullable: true },
        vehicleNumber: { type: 'string', nullable: true },
        weighmentSlipNote: { type: 'string', nullable: true },
        isClaim: { type: 'boolean', nullable: true },
        claimDetails: { type: 'string', nullable: true },
        ownerName: { type: 'string', nullable: true },

        weighmentSlips: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 409, description: 'Invoice number conflict' })
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @UploadedFiles() weighmentSlips?: Express.Multer.File[],
  ) {
    return this.invoicesService.create(createInvoiceDto, weighmentSlips);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, description: 'List of all invoices' })
  findAll() {
    return this.invoicesService.findAll();
  }

  // ===============================
  // ADMIN ENDPOINTS (must be before :id route)
  // ===============================

  @Get('admin/filter')
  @ApiOperation({
    summary: 'Filter invoices for admin dashboard',
    description:
      'Filter invoices by invoice type, date range, supplier name, buyer name, or user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered list of invoices',
  })
  async filterInvoices(@Query() filterDto: FilterInvoicesDto) {
    return this.invoicesService.filterInvoices(filterDto);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all invoices for a specific user' })
  @ApiResponse({ status: 200, description: 'List of user invoices' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findByUserId(@Param('userId') userId: string) {
    return this.invoicesService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice found' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FilesInterceptor('weighmentSlips', 10))
  @UsePipes(new ParseFormDataPipe())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update an invoice' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        invoiceNumber: { type: 'string', nullable: true },
        invoiceDate: { type: 'string', format: 'date', nullable: true },
        terms: { type: 'string', nullable: true },
        supplierName: { type: 'string', nullable: true },
        supplierAddress: {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        },
        placeOfSupply: { type: 'string', nullable: true },
        billToName: { type: 'string', nullable: true },
        billToAddress: {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        },
        shipToName: { type: 'string', nullable: true },
        shipToAddress: {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        },
        productName: {
          type: 'array',
          items: { type: 'string' },
          nullable: true,
        },
        hsnCode: { type: 'string', nullable: true },
        quantity: { type: 'number', nullable: true },
        rate: { type: 'number', nullable: true },
        amount: { type: 'number', nullable: true },
        truckNumber: { type: 'string', nullable: true },
        vehicleNumber: { type: 'string', nullable: true },
        weighmentSlipNote: { type: 'string', nullable: true },
        isClaim: { type: 'boolean', nullable: true },
        claimDetails: { type: 'string', nullable: true },
        weighmentSlips: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 409, description: 'Invoice number conflict' })
  update(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @UploadedFiles() weighmentSlips?: Express.Multer.File[],
  ) {
    return this.invoicesService.update(id, updateInvoiceDto, weighmentSlips);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  @ApiResponse({ status: 204, description: 'Invoice deleted successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }

  @Post('admin/export')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Export filtered invoices to Excel',
    description:
      'Export invoices to Excel file based on date range, invoice type, or specific invoice IDs',
  })
  @ApiResponse({
    status: 200,
    description: 'Excel file with filtered invoices',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async exportInvoices(
    @Body() exportDto: ExportInvoicesDto,
    @Res() res: Response,
  ) {
    const excelBuffer =
      await this.invoicesService.exportInvoicesToExcel(exportDto);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `invoices-export-${timestamp}.xlsx`;

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length.toString());

    // Send Excel file
    res.send(excelBuffer);
  }
}

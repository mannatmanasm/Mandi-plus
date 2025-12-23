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
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ParseFormDataPipe } from '../../common/pipes/parse-form-data.pipe';

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
        invoiceNumber: { type: 'string' },
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
        supplierAddress: { type: 'array', items: { type: 'string' }, nullable: true },
        placeOfSupply: { type: 'string', nullable: true },
        billToName: { type: 'string', nullable: true },
        billToAddress: { type: 'array', items: { type: 'string' }, nullable: true },
        shipToName: { type: 'string', nullable: true },
        shipToAddress: { type: 'array', items: { type: 'string' }, nullable: true },
        productName: { type: 'array', items: { type: 'string' }, nullable: true },
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
}


import {
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceType } from '../../../common/enums/invoice-type.enum';

export class ExportInvoicesDto {
  @ApiPropertyOptional({
    description: 'Filter by invoice type',
    enum: InvoiceType,
    example: InvoiceType.SUPPLIER_INVOICE,
  })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({
    description:
      'Start date and time for filtering (ISO date-time string). Required if invoiceIds not provided.',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'End date and time for filtering (ISO date-time string). Required if invoiceIds not provided.',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Specific invoice IDs to export (if provided, date range is ignored)',
    type: [String],
    example: ['invoice-id-1', 'invoice-id-2'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  invoiceIds?: string[];
}


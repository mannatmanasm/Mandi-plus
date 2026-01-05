import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceType } from '../../../common/enums/invoice-type.enum';

export class FilterInvoicesDto {
  @ApiPropertyOptional({
    description: 'Filter by invoice type',
    enum: InvoiceType,
    example: InvoiceType.SUPPLIER_INVOICE,
  })
  @IsOptional()
  @IsEnum(InvoiceType)
  invoiceType?: InvoiceType;

  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO date string or date-time)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for filtering (ISO date string or date-time)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by supplier name (partial match)',
    example: 'ABC Suppliers',
  })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({
    description: 'Filter by buyer name (billToName, partial match)',
    example: 'XYZ Traders',
  })
  @IsOptional()
  @IsString()
  buyerName?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: 'user-uuid-here',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}


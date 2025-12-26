import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';

export class CreateInvoiceDto {
  @ApiProperty({ example: 'INV-2024-001', description: 'Invoice number' })
  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @ApiProperty({ example: '2024-01-15', description: 'Invoice date' })
  @IsDateString()
  @IsNotEmpty()
  invoiceDate: string;

  @ApiPropertyOptional({ example: 'Net 30', description: 'Payment terms' })
  @IsString()
  @IsOptional()
  terms?: string;

  // Supplier details
  @ApiProperty({ example: 'ABC Suppliers', description: 'Supplier name' })
  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @ApiProperty({
    example: ['123 Main St', 'Mumbai, Maharashtra 400001'],
    description: 'Supplier address lines'
  })
  //Allow string or JSON string to become Array
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // If it looks like JSON array "['Addr']", parse it. If regular string, wrap in array.
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  supplierAddress: string[];

  @ApiProperty({ example: 'Maharashtra', description: 'Place of supply' })
  @IsString()
  @IsNotEmpty()
  placeOfSupply: string;

  // Buyer details
  @ApiProperty({ example: 'XYZ Traders', description: 'Bill to name' })
  @IsString()
  @IsNotEmpty()
  billToName: string;

  @ApiProperty({
    example: ['456 Market St', 'Delhi 110001'],
    description: 'Bill to address lines'
  })
  // Allow string or JSON string to become Array
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  billToAddress: string[];

  @ApiProperty({ example: 'XYZ Traders', description: 'Ship to name' })
  @IsString()
  @IsNotEmpty()
  shipToName: string;

  @ApiProperty({
    example: ['456 Market St', 'Delhi 110001'],
    description: 'Ship to address lines'
  })
  // Allow string or JSON string to become Array
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return value;
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  shipToAddress: string[];

  // Item details
  @ApiProperty({ example: 'Wheat', description: 'Product name' })
  @Transform(({ value }) => {
    // If it's already a string, return as is
    if (typeof value === 'string') return value;
    // If it's an array, return the first element
    if (Array.isArray(value)) return value[0] || '';
    // For any other case, return empty string
    return '';
  })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiPropertyOptional({ example: '1001', description: 'HSN code' })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiProperty({ example: 100.5, description: 'Quantity' })
  // Convert String "100" to Number 100
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 50.75, description: 'Rate per unit' })
  // Convert String to Number
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ example: 5082.50, description: 'Total amount' })
  // Convert String to Number
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  // Transport/Vehicle
  @ApiPropertyOptional({ example: 'MH12AB1234', description: 'Truck number' })
  @IsString()
  @IsOptional()
  truckNumber?: string;

  @ApiPropertyOptional({ example: 'MH12AB1234', description: 'Vehicle number' })
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  // Weighbridge details
  @ApiPropertyOptional({ example: 'Weighment slip note', description: 'Weighment slip note' })
  @IsString()
  @IsOptional()
  weighmentSlipNote?: string;

  // Claim details
  @ApiPropertyOptional({ example: false, description: 'Is this a claim invoice' })
  // Handle Boolean conversion from string
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @IsOptional()
  isClaim?: boolean;

  @ApiPropertyOptional({ example: 'Claim details here', description: 'Claim details' })
  @IsString()
  @IsOptional()
  claimDetails?: string;
}
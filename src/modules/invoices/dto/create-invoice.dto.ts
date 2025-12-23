import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsDateString,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  shipToAddress: string[];

  // Item details
  @ApiProperty({ example: ['Wheat', 'Rice'], description: 'Product names' })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productName: string[];

  @ApiPropertyOptional({ example: '1001', description: 'HSN code' })
  @IsString()
  @IsOptional()
  hsnCode?: string;

  @ApiProperty({ example: 100.5, description: 'Quantity' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 50.75, description: 'Rate per unit' })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiProperty({ example: 5082.50, description: 'Total amount' })
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
  @IsBoolean()
  @IsOptional()
  isClaim?: boolean;

  @ApiPropertyOptional({ example: 'Claim details here', description: 'Claim details' })
  @IsString()
  @IsOptional()
  claimDetails?: string;
}


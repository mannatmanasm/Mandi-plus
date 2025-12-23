import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsArray,
    Matches,
    MaxLength,
  } from 'class-validator';
  import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
  
  export class CreateTruckDto {
    @ApiProperty({
      example: 'MH12AB1234',
      description: 'Truck registration number',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/, {
      message: 'Invalid truck number format (e.g. MH12AB1234)',
    })
    @MaxLength(20)
    truckNumber: string;
  
    @ApiProperty({
      example: 'Rajesh Kumar',
      description: 'Owner name',
    })
    @IsString()
    @IsNotEmpty()
    ownerName: string;
  
    @ApiProperty({
      example: '+919876543210',
      description: 'Owner contact number',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{1,14}$/, {
      message: 'Invalid contact number format',
    })
    @MaxLength(15)
    ownerContactNumber: string;
  
    @ApiProperty({
      example: 'Ramesh Singh',
      description: 'Driver name',
    })
    @IsString()
    @IsNotEmpty()
    driverName: string;
  
    @ApiProperty({
      example: '+919876543211',
      description: 'Driver contact number',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{1,14}$/, {
      message: 'Invalid contact number format',
    })
    @MaxLength(15)
    driverContactNumber: string;
  
    @ApiPropertyOptional({
      example: ['Office 1', 'Office 2'],
      description: 'Office addresses',
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    officeAddress?: string[];
  
    @ApiPropertyOptional({
      example: ['Route 1', 'Route 2'],
      description: 'Routes',
    })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    route?: string[];
  
    @ApiPropertyOptional({
      example: 'PERMIT123',
      description: 'Permit number',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    permit?: string;
  
    @ApiPropertyOptional({
      example: 'LIC123456',
      description: 'License number',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    licence?: string;
  
    @ApiPropertyOptional({
      example: 'CHALLAN123',
      description: 'Challan number',
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    challan?: string;
  }
  
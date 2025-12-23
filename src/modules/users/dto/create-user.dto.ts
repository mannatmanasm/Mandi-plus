import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  Matches,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Identity } from '../../../common/enums/user.enum';

export class CreateUserDto {
  @ApiProperty({ example: '+919876543210', description: 'Primary mobile number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid mobile number format' })
  @MaxLength(15)
  mobileNumber: string;

  @ApiPropertyOptional({ example: '+919876543211', description: 'Secondary mobile number' })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid mobile number format' })
  @MaxLength(15)
  secondaryMobileNumber?: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Maharashtra', description: 'State name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  state: string;

  @ApiProperty({ enum: Identity, example: Identity.SUPPLIER, description: 'User identity type' })
  @IsEnum(Identity)
  @IsOptional()
  identity?: Identity;

  @ApiPropertyOptional({ example: ['Wheat', 'Rice'], description: 'Products list' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  products?: string[];

  // Supplier specific
  @ApiPropertyOptional({ example: ['Address 1', 'Address 2'], description: 'Loading points (Supplier only)' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  loadingPoint?: string[];

  // Buyer specific
  @ApiPropertyOptional({ example: ['Shop Address 1'], description: 'Destination shop addresses (Buyer only)' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  destinationShopAddress?: string[];

  @ApiPropertyOptional({ example: ['Route 1', 'Route 2'], description: 'Routes (Buyer only)' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  route?: string[];

  // Transporter specific
  @ApiPropertyOptional({ example: ['Office Address 1'], description: 'Office addresses (Transporter only)' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  officeAddress?: string[];

  // Agent specific
  @ApiPropertyOptional({ example: ['Destination Address 1'], description: 'Destination addresses (Agent only)' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  destinationAddress?: string[];
}


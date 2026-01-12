import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateDamageFormDto {
  @ApiProperty({
    example: '2026-01-09',
    description: 'Date of damage certificate (DD/MM/YYYY or ISO)',
  })
  @IsString()
  @IsNotEmpty()
  damageCertificateDate: string;

  @ApiProperty({
    example: 'Memo No 416',
    description: 'Transport receipt / memo number',
  })
  @IsString()
  @IsNotEmpty()
  transportReceiptMemoNo: string;

  @ApiProperty({
    example: '2026-01-07',
    description: 'Transport receipt date',
  })
  @IsString()
  @IsNotEmpty()
  transportReceiptDate: string;

  @ApiProperty({
    example: 15400,
    description: 'Loaded weight in KG (pieces / boxes / bags)',
  })
  @Type(() => Number)
  @IsNumber()
  loadedWeightKg: number;

  @ApiProperty({ example: 'Sweet Potato', description: 'Product name' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({
    example: 'Sandeep Yadav, Hassan, Karnataka, India',
    description: 'From (supplier / shipper) name and address',
  })
  @IsString()
  @IsNotEmpty()
  fromParty: string;

  @ApiProperty({
    example: 'KSRT AGROMART PVT LTD, Muhana Mandi, Jaipur, RJ',
    description: 'For (buyer) name and address',
  })
  @IsString()
  @IsNotEmpty()
  forParty: string;

  @ApiProperty({
    example: '2026-01-09',
    description: 'Accident date',
  })
  @IsString()
  @IsNotEmpty()
  accidentDate: string;

  @ApiProperty({
    example: 'Aurangabad-Solapur Highway, Pachdol (MH) 431121',
    description: 'Accident location',
  })
  @IsString()
  @IsNotEmpty()
  accidentLocation: string;

  @ApiProperty({
    example: 'Vehicle collided with another vehicle. Goods shattered and damaged.',
    description: 'Accident / damage description',
  })
  @IsString()
  @IsNotEmpty()
  accidentDescription: string;

  @ApiPropertyOptional({
    example: 50000,
    description: 'Agreed damage amount in rupees (numeric)',
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  agreedDamageAmountNumber?: number;

  @ApiPropertyOptional({
    example: 'Fifty Thousand Only',
    description: 'Agreed damage amount in words',
  })
  @IsString()
  @IsOptional()
  agreedDamageAmountWords?: string;

  @ApiPropertyOptional({
    example: 'Subramanya T R',
    description: 'Authorized signatory name',
  })
  @IsString()
  @IsOptional()
  authorizedSignatoryName?: string;
}



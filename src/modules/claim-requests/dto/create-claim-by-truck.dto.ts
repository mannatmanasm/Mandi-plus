import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateClaimByTruckDto {
  @ApiProperty({
    example: 'MH12AB1234',
    description: 'Truck number to find latest invoice and create claim request',
  })
  @IsString()
  @IsNotEmpty()
  truckNumber: string;
}


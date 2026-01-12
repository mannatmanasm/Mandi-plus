import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpsertVehicleConditionDto {
  @ApiProperty({
    example: 'BR01AB1234',
    description: 'Vehicle number (uppercase, without spaces)',
  })
  @IsString()
  @IsNotEmpty()
  vehicleNumber: string;

  @ApiProperty({
    example: true,
    description: 'Permit status clear or not',
  })
  @IsBoolean()
  permitStatus: boolean;

  @ApiProperty({
    example: true,
    description: 'Driver license verified',
  })
  @IsBoolean()
  driverLicense: boolean;

  @ApiProperty({
    example: true,
    description: 'Overall vehicle condition is good',
  })
  @IsBoolean()
  vehicleCondition: boolean;

  @ApiProperty({
    example: true,
    description: 'No pending challans',
  })
  @IsBoolean()
  challanClear: boolean;

  @ApiProperty({
    example: true,
    description: 'No pending EMI',
  })
  @IsBoolean()
  emiClear: boolean;

  @ApiProperty({
    example: true,
    description: 'Fitness certificate is valid',
  })
  @IsBoolean()
  fitnessClear: boolean;
}

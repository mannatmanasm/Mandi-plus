import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimStatus } from '../../../common/enums/claim-status.enum';

export class UpdateClaimStatusDto {
  @ApiProperty({
    enum: ClaimStatus,
    example: ClaimStatus.IN_PROGRESS,
    description: 'New status for the claim',
  })
  @IsEnum(ClaimStatus)
  status: ClaimStatus;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Surveyor name (required if status is SURVEYOR_ASSIGNED)',
  })
  @IsString()
  @IsOptional()
  surveyorName?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description: 'Surveyor contact (required if status is SURVEYOR_ASSIGNED)',
  })
  @IsString()
  @IsOptional()
  surveyorContact?: string;

  @ApiPropertyOptional({
    example: 'Processing claim...',
    description: 'Additional notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}




import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClaimStatus } from '../../../common/enums/claim-status.enum';

export class FilterClaimRequestsDto {
  @ApiPropertyOptional({
    enum: ClaimStatus,
    description: 'Filter by claim status',
  })
  @IsEnum(ClaimStatus)
  @IsOptional()
  status?: ClaimStatus;

  @ApiPropertyOptional({
    description: 'Filter by invoice ID',
  })
  @IsUUID()
  @IsOptional()
  invoiceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by truck number',
  })
  @IsOptional()
  truckNumber?: string;
}


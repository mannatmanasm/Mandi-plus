import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateConsentDto {
  @ApiProperty({
    example: 'I agree to the Terms and Conditions and Privacy Policy',
    description: 'The consent text that the user has agreed to',
  })
  @IsString()
  @IsNotEmpty()
  consentText: string;
}


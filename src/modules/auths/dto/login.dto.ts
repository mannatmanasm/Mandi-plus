import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid Indian mobile number',
  })
  mobileNumber: string;
}

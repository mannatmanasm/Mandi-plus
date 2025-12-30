import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Invalid Indian mobile number',
  })
  mobileNumber: string;

  @IsString()
  @Length(4, 6, {
    message: 'OTP must be between 4 to 6 digits',
  })
  otp: string;
}

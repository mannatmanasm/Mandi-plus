import { IsString, Matches, Length } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^[6-9]\d{9}$/)
  mobileNumber: string;

  @Length(4, 6)
  otp: string;
}

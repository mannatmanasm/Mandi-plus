import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtpVerification } from 'src/entities/otp-verification.entity';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';

interface TwoFactorResponse {
  Status: 'Success' | 'Error';
  Details: string;
}

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
    private readonly httpService: HttpService,
  ) {}

  // ---------------- SEND OTP (SMS ONLY) ----------------
  async sendOtp(mobileNumber: string): Promise<void> {
    const template = 'MANDIPL_OTP';

    const url = `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${mobileNumber}/AUTOGEN/${template}`;

    const response: AxiosResponse<TwoFactorResponse> = await lastValueFrom(
      this.httpService.get(url),
    );

    if (response.data.Status !== 'Success') {
      throw new BadRequestException('Failed to send OTP');
    }

    await this.otpRepo.save(
      this.otpRepo.create({
        mobileNumber,
        providerSessionId: response.data.Details,
      }),
    );
  }

  // ---------------- VERIFY OTP ----------------
  async verifyOtp(mobileNumber: string, otp: string): Promise<void> {
    const record = await this.otpRepo.findOne({
      where: {
        mobileNumber,
        isUsed: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!record) {
      throw new BadRequestException('OTP session not found');
    }

    const url = `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/VERIFY/${record.providerSessionId}/${otp}`;

    // console.log('Verifying OTP with URL:', url);

    const response: AxiosResponse<TwoFactorResponse> = await lastValueFrom(
      this.httpService.get(url),
    );

    // console.log('OTP Verification Response:', response);

    if (response.data.Status !== 'Success') {
      throw new BadRequestException('Invalid or expired OTP');
    }

    record.isUsed = true;
    await this.otpRepo.save(record);
  }
}
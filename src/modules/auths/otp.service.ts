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

  async sendOtp(mobileNumber: string): Promise<void> {
    const apiKey = process.env.TWOFACTOR_API_KEY;

    if (!apiKey) {
      throw new Error('2Factor API key missing');
    }

    const templateName = 'MarkhetFarmer';

    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobileNumber}/AUTOGEN/${templateName}`;

    const response: AxiosResponse<TwoFactorResponse> = await lastValueFrom(
      this.httpService.get(url),
    );

    if (response.data.Status !== 'Success') {
      throw new BadRequestException('Failed to send OTP');
    }

    // Save OTP session
    const otpSession = this.otpRepo.create({
      mobileNumber,
      providerSessionId: response.data.Details,
      isUsed: false,
    });

    await this.otpRepo.save(otpSession);
  }

  // ================= VERIFY OTP =================
  async verifyOtp(mobileNumber: string, otp: string): Promise<void> {
    const record = await this.otpRepo.findOne({
      where: {
        mobileNumber,
        isUsed: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    if (!record) {
      throw new BadRequestException('OTP session not found');
    }

    const apiKey = process.env.TWOFACTOR_API_KEY;

    const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${record.providerSessionId}/${otp}`;

    const response: AxiosResponse<TwoFactorResponse> = await lastValueFrom(
      this.httpService.get(url),
    );

    if (response.data.Status !== 'Success') {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark OTP as used
    record.isUsed = true;
    await this.otpRepo.save(record);
  }
}

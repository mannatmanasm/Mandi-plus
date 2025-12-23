import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OtpVerification } from 'src/entities/otp-verification.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
  ) {}

  async generateOtp(mobileNumber: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const otpHash = await bcrypt.hash(otp, 10);

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepo.save(
      this.otpRepo.create({
        mobileNumber,
        otpHash,
        expiresAt,
      }),
    );

    return otp;
  }

  async verifyOtp(mobileNumber: string, otp: string): Promise<void> {
    const otpRecord = await this.otpRepo.findOne({
      where: {
        mobileNumber,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    otpRecord.isUsed = true;
    await this.otpRepo.save(otpRecord);
  }
}

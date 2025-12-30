import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { OtpService } from './otp.service';
import { UserSession } from 'src/entities/user-session.entity';
import { TokenService } from './token.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(UserSession)
    private readonly sessionRepo: Repository<UserSession>,

    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  // ---------- SESSION ----------
  async createSession(user: User, req: any) {
    const session = this.sessionRepo.create({
      user,
      deviceInfo: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const saved = await this.sessionRepo.save(session);

    const refreshToken = this.tokenService.generateRefreshToken(
      user.id,
      saved.id,
    );

    saved.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.sessionRepo.save(saved);

    const accessToken = this.tokenService.generateAccessToken(user.id);

    return { accessToken, refreshToken };
  }

  // ---------- SEND OTP ----------
  async sendOtp(mobileNumber: string) {
    const user = await this.userRepo.findOne({ where: { mobileNumber } });

    await this.otpService.sendOtp(mobileNumber);

    return {
      message: 'OTP sent',
      next: user ? 'LOGIN_VERIFY' : 'REGISTER',
    };
  }

  // ---------- VERIFY OTP ----------
  async verifyOtp(dto: VerifyOtpDto, req: any) {
    await this.otpService.verifyOtp(dto.mobileNumber, dto.otp);

    const user = await this.userRepo.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (!user) {
      return {
        next: 'REGISTER',
        mobileNumber: dto.mobileNumber,
      };
    }

    const tokens = await this.createSession(user, req);

    return {
      next: 'HOME',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ---------- REGISTER AFTER OTP ----------
  async registerAfterOtp(dto: RegisterDto, req: any) {
    const exists = await this.userRepo.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (exists) {
      throw new BadRequestException('User already exists');
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        mobileNumber: dto.mobileNumber,
        name: dto.name,
        state: dto.state,
      }),
    );

    return this.createSession(user, req);
  }
}

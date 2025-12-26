import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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

  // ---------------- CREATE SESSION ----------------
  async createSession(user: User, req: any) {
    const session = this.sessionRepo.create({
      user,
      deviceInfo: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    });

    const savedSession = await this.sessionRepo.save(session);

    const refreshToken = this.tokenService.generateRefreshToken(
      user.id,
      savedSession.id,
    );

    savedSession.refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.sessionRepo.save(savedSession);

    const accessToken = this.tokenService.generateAccessToken(user.id);

    return { accessToken, refreshToken };
  }

  // ---------------- REGISTER ----------------
  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (exists) {
      throw new BadRequestException('Mobile already registered');
    }

    await this.userRepo.save(
      this.userRepo.create({
        mobileNumber: dto.mobileNumber,
        name: dto.name,
        state: dto.state,
      }),
    );

    await this.otpService.sendOtp(dto.mobileNumber);

    return {
      message: 'OTP sent to mobile number',
    };
  }

  // ---------------- REGISTER VERIFY ----------------
  async verifyRegisterOtp(dto: VerifyOtpDto, req: any) {
    await this.otpService.verifyOtp(dto.mobileNumber, dto.otp);

    const user = await this.userRepo.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.createSession(user, req);
  }

  // ---------------- LOGIN ----------------
  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (!user) {
      throw new BadRequestException('User not registered');
    }

    await this.otpService.sendOtp(dto.mobileNumber);

    return {
      message: 'OTP sent to mobile number',
    };
  }

  // ---------------- LOGIN VERIFY ----------------
  async verifyLoginOtp(dto: VerifyOtpDto, req: any) {
    await this.otpService.verifyOtp(dto.mobileNumber, dto.otp);

    const user = await this.userRepo.findOne({
      where: { mobileNumber: dto.mobileNumber },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.createSession(user, req);
  }
}
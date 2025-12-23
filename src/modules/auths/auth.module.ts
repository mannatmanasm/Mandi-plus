import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

import { User } from 'src/entities/user.entity';
import { OtpVerification } from 'src/entities/otp-verification.entity';
import { UserSession } from 'src/entities/user-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OtpVerification, UserSession]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret',
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService],
  exports: [AuthService],
})
export class AuthModule {}

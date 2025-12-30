import { Controller, Post, Body, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // STEP 1: Enter mobile number
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.mobileNumber);
  }

  // STEP 2: Verify OTP
  @Post('verify-otp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req,
    @Res({ passthrough: true }) res,
  ) {
    const result = await this.authService.verifyOtp(dto, req);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  // STEP 3: Register (only after OTP verified)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req,
    @Res({ passthrough: true }) res,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.registerAfterOtp(dto, req);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 60 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }
}

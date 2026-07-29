import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  type ResetPasswordDto,
  type SetRecoveryPinDto,
} from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() payload: LoginDto) {
    return this.authService.login(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: Request, @Body() payload: ChangePasswordDto) {
    const user = req.user as { sub: number };
    return this.authService.changePassword(user.sub, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Post('set-recovery-pin')
  setRecoveryPin(@Req() req: Request, @Body() payload: SetRecoveryPinDto) {
    const user = req.user as { sub: number };
    return this.authService.setRecoveryPin(user.sub, payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recovery-pin-status')
  recoveryPinStatus(@Req() req: Request) {
    const user = req.user as { sub: number };
    return this.authService.hasRecoveryPin(user.sub);
  }

  @Post('verify-recovery-pin')
  verifyRecoveryPin(
    @Body() payload: { username: string; recoveryPin: string },
  ) {
    return this.authService.verifyRecoveryPin(
      payload.username,
      payload.recoveryPin,
    );
  }

  @Post('reset-password')
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPasswordWithPin(payload);
  }
}

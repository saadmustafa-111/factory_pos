import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

// Simple in-memory rate limiter — max 10 failed attempts per username per 15 min window
const loginFailMap = new Map<string, { count: number; resetAt: number }>();
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkLoginRateLimit(username: string): void {
  const now = Date.now();
  const entry = loginFailMap.get(username);
  if (entry && now < entry.resetAt) {
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      const waitSec = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        `Too many failed attempts. Try again in ${waitSec} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}

function recordLoginFailure(username: string): void {
  const now = Date.now();
  const entry = loginFailMap.get(username);
  if (!entry || now >= entry.resetAt) {
    loginFailMap.set(username, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearLoginFailures(username: string): void {
  loginFailMap.delete(username);
}

export interface ResetPasswordDto {
  username: string;
  recoveryPin: string;
  newPassword: string;
}

export interface SetRecoveryPinDto {
  currentPassword: string;
  recoveryPin: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(payload: LoginDto) {
    checkLoginRateLimit(payload.username);

    const user = await this.usersRepo.findOne({
      where: { username: payload.username },
    });

    if (!user) {
      recordLoginFailure(payload.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(payload.password, user.password_hash);
    if (!ok) {
      recordLoginFailure(payload.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    clearLoginFailures(payload.username);

    const token = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
    });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    };
  }

  async changePassword(userId: number, payload: ChangePasswordDto) {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const ok = await bcrypt.compare(payload.currentPassword, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Current password is invalid');
    }

    user.password_hash = await bcrypt.hash(payload.newPassword, 10);
    await this.usersRepo.save(user);
    return { message: 'Password changed successfully' };
  }

  async setRecoveryPin(userId: number, payload: SetRecoveryPinDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const ok = await bcrypt.compare(payload.currentPassword, user.password_hash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');
    user.recovery_pin_hash = await bcrypt.hash(payload.recoveryPin, 10);
    await this.usersRepo.save(user);
    return { message: 'Recovery PIN saved successfully' };
  }

  async hasRecoveryPin(userId: number) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    return { hasPin: !!(user?.recovery_pin_hash) };
  }

  async verifyRecoveryPin(username: string, recoveryPin: string) {
    checkLoginRateLimit(`pin:${username}`);
    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) throw new BadRequestException('Username not found');
    if (!user.recovery_pin_hash) throw new BadRequestException('No recovery PIN set for this account.');
    const ok = await bcrypt.compare(recoveryPin, user.recovery_pin_hash);
    if (!ok) {
      recordLoginFailure(`pin:${username}`);
      throw new BadRequestException('Incorrect recovery PIN');
    }
    clearLoginFailures(`pin:${username}`);
    return { valid: true };
  }

  async resetPasswordWithPin(payload: ResetPasswordDto) {
    checkLoginRateLimit(`pin:${payload.username}`);
    const user = await this.usersRepo.findOne({ where: { username: payload.username } });
    if (!user) throw new BadRequestException('Username not found');
    if (!user.recovery_pin_hash) throw new BadRequestException('No recovery PIN set for this account. Please contact your system administrator.');
    const ok = await bcrypt.compare(payload.recoveryPin, user.recovery_pin_hash);
    if (!ok) {
      recordLoginFailure(`pin:${payload.username}`);
      throw new BadRequestException('Incorrect recovery PIN');
    }
    if (payload.newPassword.length < 6) throw new BadRequestException('Password must be at least 6 characters');
    clearLoginFailures(`pin:${payload.username}`);
    user.password_hash = await bcrypt.hash(payload.newPassword, 10);
    await this.usersRepo.save(user);
    return { message: 'Password reset successfully' };
  }
}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DailyRegisterService } from './daily-register.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class DailyRegisterController {
  constructor(private readonly dailyRegisterService: DailyRegisterService) {}

  @Get('daily-register')
  getDailyRegister(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dailyRegisterService.getDailyRegister(from, to);
  }

  @Get('daily-detail/:date')
  getDailyDetail(@Param('date') date: string) {
    return this.dailyRegisterService.getDailyDetail(date);
  }
}

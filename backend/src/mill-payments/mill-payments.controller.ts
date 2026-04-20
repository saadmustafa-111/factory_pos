import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMillPaymentDto } from './dto/create-mill-payment.dto';
import { MillPaymentsService } from './mill-payments.service';

@UseGuards(JwtAuthGuard)
@Controller('mill-payments')
export class MillPaymentsController {
  constructor(private readonly millPaymentsService: MillPaymentsService) {}

  @Post()
  create(@Body() payload: CreateMillPaymentDto) {
    return this.millPaymentsService.create(payload);
  }

  @Get('ledger')
  ledger() {
    return this.millPaymentsService.ledger();
  }
}

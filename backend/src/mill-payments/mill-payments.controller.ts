import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
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

  @Get('ledger/:supplierId')
  ledgerBySupplier(@Param('supplierId', ParseIntPipe) supplierId: number) {
    return this.millPaymentsService.ledgerBySupplier(supplierId);
  }

  @Post(':supplierId/opening-balance')
  addOpeningBalance(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Body() body: { description: string; amount: number; balance_date: string; notes?: string },
  ) {
    return this.millPaymentsService.addOpeningBalance(supplierId, body);
  }

  @Delete('opening-balance/:id')
  deleteOpeningBalance(@Param('id', ParseIntPipe) id: number) {
    return this.millPaymentsService.deleteOpeningBalance(id);
  }

  @Post(':supplierId/manual-payment')
  addManualPayment(
    @Param('supplierId', ParseIntPipe) supplierId: number,
    @Body() body: { description: string; amount: number; payment_date: string },
  ) {
    return this.millPaymentsService.addManualPayment(supplierId, body);
  }

  @Delete('manual-payment/:id')
  deleteManualPayment(@Param('id', ParseIntPipe) id: number) {
    return this.millPaymentsService.deleteManualPayment(id);
  }
}

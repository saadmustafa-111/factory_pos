import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common';
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

  @Put(':id')
  updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { amount_paid: number; payment_date: string; notes?: string },
  ) {
    return this.millPaymentsService.updateMillPayment(id, body);
  }

  @Put('stock-in-payment/:inventoryId')
  updateStockInPayment(
    @Param('inventoryId', ParseIntPipe) inventoryId: number,
    @Body() body: { amount_paid: number },
  ) {
    return this.millPaymentsService.updateStockInPayment(inventoryId, body);
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

  @Put('opening-balance/:id')
  updateOpeningBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { description: string; amount: number; balance_date: string; notes?: string },
  ) {
    return this.millPaymentsService.updateOpeningBalance(id, body);
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

  @Put('manual-payment/:id')
  updateManualPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { description: string; amount: number; payment_date: string },
  ) {
    return this.millPaymentsService.updateManualPayment(id, body);
  }
}

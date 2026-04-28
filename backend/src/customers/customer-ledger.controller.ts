import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CustomerLedgerService } from './customer-ledger.service';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerLedgerController {
  constructor(private readonly ledgerService: CustomerLedgerService) {}

  @Get('ledger-list')
  getLedgerList(
    @Query('type') type: string,
    @Query('status') status: string,
  ) {
    return this.ledgerService.getLedgerList(type, status);
  }

  @Get('overdue-summary')
  getOverdueSummary() {
    return this.ledgerService.getOverdueSummary();
  }

  @Get('udhar-book')
  getUdharBook() {
    return this.ledgerService.getUdharBook();
  }

  @Get(':id/ledger-detail')
  getCustomerDetail(@Param('id', ParseIntPipe) id: number) {
    return this.ledgerService.getCustomerDetail(id);
  }

  @Post(':id/credit-plan')
  createInstallmentPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      total_amount: number;
      down_payment: number;
      number_of_installments: number;
      start_date: string;
      sale_id?: number;
      description?: string;
      notes?: string;
    },
  ) {
    return this.ledgerService.createInstallmentPlan(id, body);
  }

  @Post(':id/record-payment')
  recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      amount: number;
      payment_date: string;
      payment_method: string;
      installment_due_id?: number;
      installment_plan_id?: number;
      cheque_number?: string;
      bank_name?: string;
      notes?: string;
    },
  ) {
    return this.ledgerService.recordPayment(id, body);
  }

  @Put(':id/set-customer-type')
  setCustomerType(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      customer_type: string;
      credit_limit: number;
      payment_term_days: number;
    },
  ) {
    return this.ledgerService.setCustomerType(id, body);
  }
}

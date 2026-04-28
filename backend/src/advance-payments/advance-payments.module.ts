import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvancePaymentsController } from './advance-payments.controller';
import { AdvancePaymentsService } from './advance-payments.service';
import { AdvancePayment } from './entities/advance-payment.entity';
import { AdvancePaymentItem } from './entities/advance-payment-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Sale } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Inventory } from '../inventory/entities/inventory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdvancePayment,
      AdvancePaymentItem,
      Customer,
      Sale,
      SaleItem,
      Inventory,
    ]),
  ],
  controllers: [AdvancePaymentsController],
  providers: [AdvancePaymentsService],
  exports: [AdvancePaymentsService],
})
export class AdvancePaymentsModule {}

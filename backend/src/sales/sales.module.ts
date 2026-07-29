import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvancePayment } from '../advance-payments/entities/advance-payment.entity';
import { AdvancePaymentItem } from '../advance-payments/entities/advance-payment-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CementBrand } from '../products/entities/cement-brand.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { OverdueService } from './overdue.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      Payment,
      Customer,
      Inventory,
      CementBrand,
      AdvancePayment,
      AdvancePaymentItem,
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService, OverdueService],
  exports: [SalesService],
})
export class SalesModule {}

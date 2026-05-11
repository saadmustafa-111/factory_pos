import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerLedger } from './entities/customer-ledger.entity';
import { InstallmentPlan } from './entities/installment-plan.entity';
import { InstallmentDue } from './entities/installment-due.entity';
import { InstallmentPayment } from './entities/installment-payment.entity';
import { CustomerManualCredit } from './entities/customer-manual-credit.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomerLedgerService } from './customer-ledger.service';
import { CustomerLedgerController } from './customer-ledger.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerLedger,
      InstallmentPlan,
      InstallmentDue,
      InstallmentPayment,
      CustomerManualCredit,
      Sale,
      Payment,
    ]),
  ],
  controllers: [CustomersController, CustomerLedgerController],
  providers: [CustomersService, CustomerLedgerService],
  exports: [CustomersService, CustomerLedgerService],
})
export class CustomersModule {}

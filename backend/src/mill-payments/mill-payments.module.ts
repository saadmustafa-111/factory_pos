import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { MillPaymentsController } from './mill-payments.controller';
import { MillPaymentsService } from './mill-payments.service';
import { MillPayment } from './entities/mill-payment.entity';
import { SupplierOpeningBalance } from './entities/supplier-opening-balance.entity';
import { SupplierManualPayment } from './entities/supplier-manual-payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MillPayment, Inventory, Supplier, SupplierOpeningBalance, SupplierManualPayment])],
  controllers: [MillPaymentsController],
  providers: [MillPaymentsService],
})
export class MillPaymentsModule {}

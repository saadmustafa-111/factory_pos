import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/entities/expense.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { MillPayment } from '../mill-payments/entities/mill-payment.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Sale } from '../sales/entities/sale.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DailyRegisterService } from './daily-register.service';
import { DailyRegisterController } from './daily-register.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Sale, SaleItem, Inventory, Supplier, MillPayment, Expense])],
  controllers: [ReportsController, DailyRegisterController],
  providers: [ReportsService, DailyRegisterService],
})
export class ReportsModule {}

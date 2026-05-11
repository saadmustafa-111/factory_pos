import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { BackupModule } from './backup/backup.module';
import { CustomersModule } from './customers/customers.module';
import { DatabaseInitModule } from './database/database-init.module';
import { Customer } from './customers/entities/customer.entity';
import { CustomerLedger } from './customers/entities/customer-ledger.entity';
import { InstallmentPlan } from './customers/entities/installment-plan.entity';
import { InstallmentDue } from './customers/entities/installment-due.entity';
import { InstallmentPayment } from './customers/entities/installment-payment.entity';
import { CustomerManualCredit } from './customers/entities/customer-manual-credit.entity';
import { Inventory } from './inventory/entities/inventory.entity';
import { InventoryModule } from './inventory/inventory.module';
import { MillPayment } from './mill-payments/entities/mill-payment.entity';
import { SupplierOpeningBalance } from './mill-payments/entities/supplier-opening-balance.entity';
import { SupplierManualPayment } from './mill-payments/entities/supplier-manual-payment.entity';
import { MillPaymentsModule } from './mill-payments/mill-payments.module';
import { Payment } from './payments/entities/payment.entity';
import { PaymentsModule } from './payments/payments.module';
import { CementBrand } from './products/entities/cement-brand.entity';
import { Product } from './products/entities/product.entity';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SaleItem } from './sales/entities/sale-item.entity';
import { Sale } from './sales/entities/sale.entity';
import { SalesModule } from './sales/sales.module';
import { SeedService } from './seed.service';
import { Supplier } from './suppliers/entities/supplier.entity';
import { SuppliersModule } from './suppliers/suppliers.module';
import { User } from './users/entities/user.entity';
import { AdvancePaymentsModule } from './advance-payments/advance-payments.module';
import { AdvancePayment } from './advance-payments/entities/advance-payment.entity';
import { AdvancePaymentItem } from './advance-payments/entities/advance-payment-item.entity';
import { AttachmentsModule } from './attachments/attachments.module';
import { Attachment } from './attachments/entities/attachment.entity';
import { ExpensesModule } from './expenses/expenses.module';
import { Expense } from './expenses/entities/expense.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_DIR
        ? join(process.env.DATABASE_DIR, 'factory-pos.sqlite')
        : join(process.cwd(), 'database', 'factory-pos.sqlite'),
      entities: [
        User,
        Supplier,
        Customer,
        Product,
        CementBrand,
        Inventory,
        Sale,
        SaleItem,
        Payment,
        MillPayment,
        SupplierOpeningBalance,
        SupplierManualPayment,
        CustomerLedger,
        InstallmentPlan,
        InstallmentDue,
        InstallmentPayment,
        CustomerManualCredit,
        AdvancePayment,
        AdvancePaymentItem,
        Attachment,
        Expense,
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Product, Supplier, CementBrand]),
    AuthModule,
    DatabaseInitModule,
    BackupModule,
    SuppliersModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    PaymentsModule,
    MillPaymentsModule,
    ReportsModule,
    AdvancePaymentsModule,
    AttachmentsModule,
    ExpensesModule,
  ],
  providers: [SeedService],
})
export class AppModule {}

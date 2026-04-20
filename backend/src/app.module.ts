import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { Customer } from './customers/entities/customer.entity';
import { Inventory } from './inventory/entities/inventory.entity';
import { InventoryModule } from './inventory/inventory.module';
import { MillPayment } from './mill-payments/entities/mill-payment.entity';
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

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: join(process.cwd(), 'database', 'factory-pos.sqlite'),
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
      ],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Product, Supplier, CementBrand]),
    AuthModule,
    SuppliersModule,
    CustomersModule,
    ProductsModule,
    InventoryModule,
    SalesModule,
    PaymentsModule,
    MillPaymentsModule,
    ReportsModule,
  ],
  providers: [SeedService],
})
export class AppModule {}

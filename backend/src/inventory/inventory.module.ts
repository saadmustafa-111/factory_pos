import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CementBrand } from '../products/entities/cement-brand.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { InventoryController } from './inventory.controller';
import { Inventory } from './entities/inventory.entity';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, SaleItem, Supplier, CementBrand])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

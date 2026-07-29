import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from '../expenses/entities/expense.entity';
import { Product } from '../products/entities/product.entity';
import { ManagedOption } from './entities/managed-option.entity';
import { OptionsController } from './options.controller';
import { OptionsService } from './options.service';

@Module({
  imports: [TypeOrmModule.forFeature([ManagedOption, Product, Expense])],
  controllers: [OptionsController],
  providers: [OptionsService],
  exports: [OptionsService],
})
export class OptionsModule {}

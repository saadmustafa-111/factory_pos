import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  Product,
  ProductCategory,
  ProductUnit,
} from './products/entities/product.entity';
import { CementBrand } from './products/entities/cement-brand.entity';
import { Expense } from './expenses/entities/expense.entity';
import {
  ManagedOption,
  ManagedOptionScope,
} from './options/entities/managed-option.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { User } from './users/entities/user.entity';
import { OptionsService } from './options/options.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
    @InjectRepository(CementBrand)
    private readonly brandsRepo: Repository<CementBrand>,
    @InjectRepository(ManagedOption)
    private readonly optionsRepo: Repository<ManagedOption>,
    @InjectRepository(Expense)
    private readonly expensesRepo: Repository<Expense>,
    private readonly optionsService: OptionsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const userCount = await this.usersRepo.count();
    if (userCount === 0) {
      const password_hash = await bcrypt.hash('factory@2024', 10);
      const recovery_pin_hash = await bcrypt.hash('1234', 10);
      await this.usersRepo.save(
        this.usersRepo.create({
          name: 'Administrator',
          username: 'admin',
          password_hash,
          role: 'admin',
          recovery_pin_hash,
        }),
      );
    } else {
      // Ensure all existing users have a default recovery PIN if not set
      const usersWithoutPin = await this.usersRepo.find();
      for (const u of usersWithoutPin) {
        if (!u.recovery_pin_hash) {
          u.recovery_pin_hash = await bcrypt.hash('1234', 10);
          await this.usersRepo.save(u);
        }
      }
    }

    // Auto-migrate: update any sariya products still using maund → kg
    await this.productsRepo
      .createQueryBuilder()
      .update()
      .set({ unit: ProductUnit.KG })
      .where('category = :cat AND unit = :old', {
        cat: ProductCategory.SARIYA,
        old: ProductUnit.MAUND,
      })
      .execute();

    const productCount = await this.productsRepo.count();
    const supplierCount = await this.suppliersRepo.count();
    const brandCount = await this.brandsRepo.count();

    if (supplierCount === 0) {
      // No default suppliers — they will be added manually by the user
    }

    if (brandCount === 0) {
      await this.brandsRepo.save([
        this.brandsRepo.create({ brand_name: 'Best Way', is_active: true }),
        this.brandsRepo.create({ brand_name: 'Fauji', is_active: true }),
        this.brandsRepo.create({
          brand_name: 'Maple Leaf White',
          is_active: true,
        }),
        this.brandsRepo.create({
          brand_name: 'Best Way White',
          is_active: true,
        }),
      ]);
    }

    if (productCount === 0) {
      await this.productsRepo.save([
        this.productsRepo.create({
          name: 'Sariya 3/4"',
          category: ProductCategory.SARIYA,
          type: '3/4"',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Sariya 5/8"',
          category: ProductCategory.SARIYA,
          type: '5/8"',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Sariya 1/2"',
          category: ProductCategory.SARIYA,
          type: '1/2"',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Sariya 3/8"',
          category: ProductCategory.SARIYA,
          type: '3/8"',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Sariya 1/4"',
          category: ProductCategory.SARIYA,
          type: '1/4"',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Cement',
          category: ProductCategory.CEMENT,
          type: 'brand',
          unit: ProductUnit.BAG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Ring',
          category: ProductCategory.RINGS,
          type: 'standard',
          unit: ProductUnit.PIECE,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Binding Wire',
          category: ProductCategory.WIRE,
          type: 'standard',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Iron Nail',
          category: ProductCategory.WIRE,
          type: 'nail',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Tile Bond',
          category: ProductCategory.WIRE,
          type: 'tile_bond',
          unit: ProductUnit.BAG,
          is_active: true,
        }),
      ]);
    }

    await this.optionsService.ensureDefaults(ManagedOptionScope.PRODUCT_CATEGORY, [
      ...Object.values(ProductCategory),
      ...(await this.productsRepo
        .createQueryBuilder('product')
        .select('DISTINCT product.category', 'value')
        .where("product.category IS NOT NULL AND TRIM(product.category) != ''")
        .getRawMany<{ value: string }>())
        .map((row) => row.value),
    ]);

    await this.optionsService.ensureDefaults(ManagedOptionScope.PRODUCT_UNIT, [
      ...Object.values(ProductUnit),
      ...(await this.productsRepo
        .createQueryBuilder('product')
        .select('DISTINCT product.unit', 'value')
        .where("product.unit IS NOT NULL AND TRIM(product.unit) != ''")
        .getRawMany<{ value: string }>())
        .map((row) => row.value),
    ]);

    await this.optionsService.ensureDefaults(ManagedOptionScope.PRODUCT_TYPE, [
      ...(await this.productsRepo
        .createQueryBuilder('product')
        .select('DISTINCT product.type', 'value')
        .where("product.type IS NOT NULL AND TRIM(product.type) != ''")
        .getRawMany<{ value: string }>())
        .map((row) => row.value),
      'standard',
    ]);

    await this.optionsService.ensureDefaults(ManagedOptionScope.EXPENSE_CATEGORY, [
      'transport',
      'labour',
      'rent',
      'utilities',
      'salary',
      'maintenance',
      'other',
      ...(await this.expensesRepo
        .createQueryBuilder('expense')
        .select('DISTINCT expense.category', 'value')
        .where("expense.category IS NOT NULL AND TRIM(expense.category) != ''")
        .getRawMany<{ value: string }>())
        .map((row) => row.value),
    ]);
  }
}

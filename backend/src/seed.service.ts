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
import { Supplier } from './suppliers/entities/supplier.entity';
import { User } from './users/entities/user.entity';

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
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const userCount = await this.usersRepo.count();
    if (userCount === 0) {
      const password_hash = await bcrypt.hash('factory@2024', 10);
      await this.usersRepo.save(
        this.usersRepo.create({
          name: 'Administrator',
          username: 'admin',
          password_hash,
          role: 'admin',
        }),
      );
    }

    const productCount = await this.productsRepo.count();
    const supplierCount = await this.suppliersRepo.count();
    const brandCount = await this.brandsRepo.count();

    if (supplierCount === 0) {
      await this.suppliersRepo.save([
        this.suppliersRepo.create({ name: 'Fauji Cement Company', is_active: true }),
        this.suppliersRepo.create({ name: 'Bestway Cement', is_active: true }),
        this.suppliersRepo.create({ name: 'Askari Cement', is_active: true }),
        this.suppliersRepo.create({ name: 'White Cement Co.', is_active: true }),
        this.suppliersRepo.create({ name: 'Local Steel Mill', is_active: true }),
      ]);
    }

    if (brandCount === 0) {
      const suppliers = await this.suppliersRepo.find();
      const byName = new Map(suppliers.map((s) => [s.name, s.id]));
      await this.brandsRepo.save([
        this.brandsRepo.create({
          brand_name: 'Fauji',
          supplier_id: byName.get('Fauji Cement Company'),
          is_active: true,
        }),
        this.brandsRepo.create({
          brand_name: 'Bestway',
          supplier_id: byName.get('Bestway Cement'),
          is_active: true,
        }),
        this.brandsRepo.create({
          brand_name: 'Askari',
          supplier_id: byName.get('Askari Cement'),
          is_active: true,
        }),
        this.brandsRepo.create({
          brand_name: 'White Cement',
          supplier_id: byName.get('White Cement Co.'),
          is_active: true,
        }),
      ]);
    }

    if (productCount === 0) {
      await this.productsRepo.save([
        this.productsRepo.create({
          name: 'Sariya Thin',
          category: ProductCategory.SARIYA,
          type: 'thin',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Sariya Thick',
          category: ProductCategory.SARIYA,
          type: 'thick',
          unit: ProductUnit.KG,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Rings',
          category: ProductCategory.RINGS,
          type: 'standard',
          unit: ProductUnit.PIECE,
          is_active: true,
        }),
        this.productsRepo.create({
          name: 'Steel Wire',
          category: ProductCategory.WIRE,
          type: 'standard',
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
      ]);
    }
  }
}

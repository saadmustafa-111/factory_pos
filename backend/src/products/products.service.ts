import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCementBrandDto } from './dto/create-cement-brand.dto';
import { CementBrand } from './entities/cement-brand.entity';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(CementBrand)
    private readonly brandsRepo: Repository<CementBrand>,
  ) {}

  findAllActive() {
    return this.productsRepo.find({
      where: { is_active: true },
      order: { id: 'ASC' },
    });
  }

  findAll() {
    return this.productsRepo.find({ order: { id: 'ASC' } });
  }

  async addProduct(body: { name: string; category: string; type: string; unit: string }) {
    return this.productsRepo.save(
      this.productsRepo.create({
        name: body.name,
        category: body.category as any,
        type: body.type || 'standard',
        unit: body.unit as any,
        is_active: true,
      }),
    );
  }

  async updateProductUnit(id: number, unit: string) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.unit = unit as any;
    return this.productsRepo.save(product);
  }

  async removeProduct(id: number) {
    const product = await this.productsRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    product.is_active = false;
    await this.productsRepo.save(product);
    return { message: 'Product removed' };
  }

  getCementBrands() {
    return this.brandsRepo.find({
      where: { is_active: true },
      order: { brand_name: 'ASC' },
    });
  }

  addCementBrand(payload: CreateCementBrandDto) {
    return this.brandsRepo.save(
      this.brandsRepo.create({
        brand_name: payload.brand_name,
        supplier_id: payload.supplier_id,
        is_active: true,
      }),
    );
  }

  async removeCementBrand(id: number) {
    const brand = await this.brandsRepo.findOne({ where: { id } });
    if (!brand) {
      throw new NotFoundException('Brand not found');
    }
    await this.brandsRepo.remove(brand);
    return { message: 'Brand removed' };
  }
}

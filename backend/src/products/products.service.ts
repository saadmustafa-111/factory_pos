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

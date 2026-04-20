import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
  ) {}

  findAll() {
    return this.suppliersRepo.find({ order: { name: 'ASC' } });
  }

  create(payload: CreateSupplierDto) {
    return this.suppliersRepo.save(this.suppliersRepo.create(payload));
  }

  async update(id: number, payload: UpdateSupplierDto) {
    const supplier = await this.suppliersRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    Object.assign(supplier, payload);
    return this.suppliersRepo.save(supplier);
  }

  async remove(id: number) {
    const supplier = await this.suppliersRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    await this.suppliersRepo.remove(supplier);
    return { message: 'Supplier removed' };
  }
}

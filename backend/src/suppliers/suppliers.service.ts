import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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
    return this.suppliersRepo.find({ where: { is_active: true }, order: { name: 'ASC' } });
  }

  async create(payload: CreateSupplierDto) {
    const existing = await this.suppliersRepo.findOne({ where: { name: payload.name, is_active: true } });
    if (existing) {
      throw new ConflictException(`A supplier named "${payload.name}" already exists.`);
    }
    // Reuse soft-deleted row if name matches
    const deleted = await this.suppliersRepo.findOne({ where: { name: payload.name, is_active: false } });
    if (deleted) {
      Object.assign(deleted, payload, { is_active: true });
      return this.suppliersRepo.save(deleted);
    }
    return this.suppliersRepo.save(this.suppliersRepo.create(payload));
  }

  async update(id: number, payload: UpdateSupplierDto) {
    const supplier = await this.suppliersRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    if (payload.name && payload.name !== supplier.name) {
      const existing = await this.suppliersRepo.findOne({ where: { name: payload.name, is_active: true } });
      if (existing) {
        throw new ConflictException(`A supplier named "${payload.name}" already exists.`);
      }
    }
    Object.assign(supplier, payload);
    return this.suppliersRepo.save(supplier);
  }

  async remove(id: number) {
    const supplier = await this.suppliersRepo.findOne({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    supplier.is_active = false;
    await this.suppliersRepo.save(supplier);
    return { message: 'Supplier removed' };
  }
}

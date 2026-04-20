import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
  ) {}

  findAll() {
    return this.customersRepo.find({ order: { name: 'ASC' } });
  }

  create(payload: CreateCustomerDto) {
    return this.customersRepo.save(this.customersRepo.create(payload));
  }

  async update(id: number, payload: UpdateCustomerDto) {
    const customer = await this.customersRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    Object.assign(customer, payload);
    return this.customersRepo.save(customer);
  }
}

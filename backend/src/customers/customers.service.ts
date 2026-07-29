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

  private normalizePayload(payload: UpdateCustomerDto) {
    const normalized = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined),
    ) as UpdateCustomerDto;

    for (const key of [
      'name',
      'phone',
      'address',
      'notes',
      'vehicle_number',
      'cnic',
      'relation_with_me',
      'image_url',
      'gmail',
      'facebook_link',
      'social_link',
    ] as const) {
      if (key in normalized) {
        const value = normalized[key];
        normalized[key] = typeof value === 'string' ? value.trim() : value;
      }
    }

    if (normalized.phone === '') normalized.phone = null as unknown as string;
    if (normalized.address === '')
      normalized.address = null as unknown as string;
    if (normalized.notes === '') normalized.notes = null as unknown as string;
    if (normalized.cnic === '') normalized.cnic = null as unknown as string;
    if (normalized.relation_with_me === '')
      normalized.relation_with_me = null as unknown as string;
    if (normalized.image_url === '')
      normalized.image_url = null as unknown as string;
    if (normalized.gmail === '') normalized.gmail = null as unknown as string;
    if (normalized.facebook_link === '')
      normalized.facebook_link = null as unknown as string;
    if (normalized.social_link === '')
      normalized.social_link = null as unknown as string;
    if (normalized.vehicle_number === '' || normalized.has_vehicle === false) {
      normalized.vehicle_number = null as unknown as string;
    }

    return normalized;
  }

  async update(id: number, payload: UpdateCustomerDto) {
    const customer = await this.customersRepo.findOne({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');
    Object.assign(customer, this.normalizePayload(payload));
    return this.customersRepo.save(customer);
  }
}

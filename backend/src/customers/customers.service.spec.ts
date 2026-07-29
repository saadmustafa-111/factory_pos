import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: jest.Mocked<Repository<Customer>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(CustomersService);
    repo = moduleRef.get(getRepositoryToken(Customer));
  });

  it('persists has_vehicle and clears optional blanks intentionally', async () => {
    const customer = {
      id: 5,
      name: 'Existing',
      phone: '0300',
      address: 'Old address',
      notes: 'Old note',
      has_vehicle: true,
      vehicle_number: 'ABC-123',
    } as Customer;

    repo.findOne.mockResolvedValue(customer);
    repo.save.mockImplementation(async (value) => value as Customer);

    const updated = await service.update(5, {
      name: ' Updated Customer ',
      has_vehicle: false,
      phone: '',
      vehicle_number: '',
      notes: '  ',
    });

    expect(repo.save).toHaveBeenCalled();
    expect(updated.name).toBe('Updated Customer');
    expect(updated.has_vehicle).toBe(false);
    expect(updated.phone).toBeNull();
    expect(updated.vehicle_number).toBeNull();
    expect(updated.notes).toBeNull();
  });

  it('throws when updating a missing customer', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.update(99, { name: 'Missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

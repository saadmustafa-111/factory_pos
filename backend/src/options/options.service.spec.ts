import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Expense } from '../expenses/entities/expense.entity';
import { Product } from '../products/entities/product.entity';
import {
  ManagedOption,
  ManagedOptionScope,
} from './entities/managed-option.entity';
import { OptionsService } from './options.service';

describe('OptionsService', () => {
  let service: OptionsService;
  let optionsRepo: any;
  let productsRepo: any;
  let expensesRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    optionsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn((value) => value),
    };
    productsRepo = {
      count: jest.fn(),
    };
    expensesRepo = {
      count: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OptionsService,
        { provide: getRepositoryToken(ManagedOption), useValue: optionsRepo },
        { provide: getRepositoryToken(Product), useValue: productsRepo },
        { provide: getRepositoryToken(Expense), useValue: expensesRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(OptionsService);
  });

  it('creates a category with trimmed name', async () => {
    optionsRepo.findOne.mockResolvedValue(null);
    optionsRepo.save.mockImplementation(async (value: any) => value);

    const result = await service.create(ManagedOptionScope.PRODUCT_CATEGORY, '  Steel  ');

    expect(result.name).toBe('Steel');
    expect(result.normalized_name).toBe('steel');
  });

  it('prevents duplicate categories case-insensitively', async () => {
    optionsRepo.findOne.mockResolvedValue({ id: 1, is_active: true });

    await expect(
      service.create(ManagedOptionScope.PRODUCT_CATEGORY, 'piece'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks deleting an in-use product unit', async () => {
    optionsRepo.findOne.mockResolvedValue({ id: 2, name: 'Kg', scope: ManagedOptionScope.PRODUCT_UNIT });
    productsRepo.count.mockResolvedValue(3);

    await expect(
      service.remove(ManagedOptionScope.PRODUCT_UNIT, 2),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

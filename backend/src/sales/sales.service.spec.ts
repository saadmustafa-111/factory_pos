import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  AdvancePayment,
  AdvancePaymentStatus,
} from '../advance-payments/entities/advance-payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Payment } from '../payments/entities/payment.entity';
import { SalesService } from './sales.service';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';

describe('SalesService', () => {
  let service: SalesService;
  let salesRepo: { findOne: jest.Mock; remove: jest.Mock };
  let saleItemsRepo: { remove: jest.Mock };
  let paymentsRepo: { remove: jest.Mock };
  let advancePaymentsRepo: { findOne: jest.Mock; save: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    salesRepo = {
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    saleItemsRepo = {
      remove: jest.fn(),
    };
    paymentsRepo = {
      remove: jest.fn(),
    };
    advancePaymentsRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: getRepositoryToken(Sale), useValue: {} },
        { provide: getRepositoryToken(SaleItem), useValue: {} },
        { provide: getRepositoryToken(Payment), useValue: {} },
        { provide: getRepositoryToken(Customer), useValue: {} },
        { provide: getRepositoryToken(Inventory), useValue: {} },
        { provide: getRepositoryToken(AdvancePayment), useValue: {} },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = moduleRef.get(SalesService);

    dataSource.transaction.mockImplementation(async (cb: any) =>
      cb({
        getRepository: (entity: unknown) => {
          if (entity === Sale) return salesRepo;
          if (entity === SaleItem) return saleItemsRepo;
          if (entity === Payment) return paymentsRepo;
          if (entity === AdvancePayment) return advancePaymentsRepo;
          throw new Error('Unexpected repository');
        },
      }),
    );
  });

  it('deletes a sale and reverses linked advance pickup state transactionally', async () => {
    const sale = {
      id: 11,
      notes: 'Pickup from Advance Payment #7.',
      items: [
        {
          product_id: 1,
          cement_brand_id: null,
          sale_price_per_unit: 250,
          quantity: 5,
        },
      ],
      payments: [{ id: 3 }],
    } as unknown as Sale;

    const advancePayment = {
      id: 7,
      status: AdvancePaymentStatus.COMPLETED,
      converted_sale_id: 11,
      items: [
        {
          product_id: 1,
          cement_brand_id: null,
          rate_per_unit: 250,
          quantity_picked: 5,
        },
      ],
    } as AdvancePayment;

    salesRepo.findOne.mockResolvedValue(sale);
    advancePaymentsRepo.findOne.mockResolvedValue(advancePayment);
    saleItemsRepo.remove.mockResolvedValue(undefined);
    paymentsRepo.remove.mockResolvedValue(undefined);
    salesRepo.remove.mockResolvedValue(undefined);
    advancePaymentsRepo.save.mockResolvedValue(advancePayment);

    const result = await service.remove(11);

    expect(advancePayment.items[0].quantity_picked).toBe(0);
    expect(advancePayment.status).toBe(AdvancePaymentStatus.PENDING);
    expect(paymentsRepo.remove).toHaveBeenCalledWith(sale.payments);
    expect(saleItemsRepo.remove).toHaveBeenCalledWith(sale.items);
    expect(salesRepo.remove).toHaveBeenCalledWith(sale);
    expect(result.message).toBe('Sale deleted successfully');
  });

  it('throws for an invalid sale id', async () => {
    salesRepo.findOne.mockResolvedValue(null);

    await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects deletion when linked advance pickup quantities are inconsistent', async () => {
    salesRepo.findOne.mockResolvedValue({
      id: 12,
      notes: 'Pickup from Advance Payment #8.',
      items: [
        {
          product_id: 1,
          cement_brand_id: null,
          sale_price_per_unit: 250,
          quantity: 10,
        },
      ],
      payments: [],
    } as unknown as Sale);

    advancePaymentsRepo.findOne.mockResolvedValue({
      id: 8,
      status: AdvancePaymentStatus.COMPLETED,
      converted_sale_id: 12,
      items: [
        {
          product_id: 1,
          cement_brand_id: null,
          rate_per_unit: 250,
          quantity_picked: 4,
        },
      ],
    } as AdvancePayment);

    await expect(service.remove(12)).rejects.toBeInstanceOf(BadRequestException);
    expect(salesRepo.remove).not.toHaveBeenCalled();
  });
});

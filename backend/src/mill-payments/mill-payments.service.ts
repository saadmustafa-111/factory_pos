import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Inventory,
  InventoryPaymentStatus,
} from '../inventory/entities/inventory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { CreateMillPaymentDto } from './dto/create-mill-payment.dto';
import { MillPayment } from './entities/mill-payment.entity';

@Injectable()
export class MillPaymentsService {
  constructor(
    @InjectRepository(MillPayment)
    private readonly millPaymentsRepo: Repository<MillPayment>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
  ) {}

  async create(payload: CreateMillPaymentDto) {
    const inventory = await this.inventoryRepo.findOne({
      where: { id: payload.inventory_id },
    });
    if (!inventory) throw new NotFoundException('Inventory record not found');

    const supplier = await this.suppliersRepo.findOne({
      where: { id: payload.supplier_id },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const payment = this.millPaymentsRepo.create({
      ...payload,
      payment_date: payload.payment_date ? new Date(payload.payment_date) : new Date(),
    });
    await this.millPaymentsRepo.save(payment);

    inventory.amount_paid_to_mill += payload.amount_paid;
    inventory.amount_pending_to_mill = Math.max(
      0,
      inventory.total_cost - inventory.amount_paid_to_mill,
    );
    inventory.payment_status =
      inventory.amount_pending_to_mill === 0
        ? InventoryPaymentStatus.PAID
        : inventory.amount_paid_to_mill > 0
          ? InventoryPaymentStatus.PARTIAL
          : InventoryPaymentStatus.PENDING;
    await this.inventoryRepo.save(inventory);

    return inventory;
  }

  async ledger() {
    const suppliers = await this.suppliersRepo.find({ order: { name: 'ASC' } });
    const rows = await Promise.all(
      suppliers.map(async (supplier) => {
        const inventoryRows = await this.inventoryRepo.find({
          where: { supplier_id: supplier.id },
          order: { date: 'DESC' },
        });

        const totalPurchased = inventoryRows.reduce((sum, row) => sum + row.total_cost, 0);
        const totalPaid = inventoryRows.reduce(
          (sum, row) => sum + row.amount_paid_to_mill,
          0,
        );
        const balance = totalPurchased - totalPaid;

        return {
          supplier,
          totalPurchased,
          totalPaid,
          balance,
          inventoryRecords: inventoryRows,
        };
      }),
    );

    return rows;
  }
}

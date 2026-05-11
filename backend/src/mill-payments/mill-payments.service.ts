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
import { SupplierOpeningBalance } from './entities/supplier-opening-balance.entity';
import { SupplierManualPayment } from './entities/supplier-manual-payment.entity';

@Injectable()
export class MillPaymentsService {
  constructor(
    @InjectRepository(MillPayment)
    private readonly millPaymentsRepo: Repository<MillPayment>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
    @InjectRepository(SupplierOpeningBalance)
    private readonly openingBalancesRepo: Repository<SupplierOpeningBalance>,
    @InjectRepository(SupplierManualPayment)
    private readonly manualPaymentsRepo: Repository<SupplierManualPayment>,
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

        const openingBalances = await this.openingBalancesRepo.find({
          where: { supplier_id: supplier.id },
        });

        const manualPayments = await this.manualPaymentsRepo.find({
          where: { supplier_id: supplier.id },
        });

        const totalPurchased =
          inventoryRows.reduce((sum, row) => sum + row.total_cost, 0) +
          openingBalances.reduce((sum, ob) => sum + ob.amount, 0);
        const totalPaid =
          inventoryRows.reduce((sum, row) => sum + row.amount_paid_to_mill, 0) +
          manualPayments.reduce((sum, mp) => sum + mp.amount, 0);
        const balance = totalPurchased - totalPaid;

        return {
          supplier,
          totalPurchased,
          totalPaid,
          balance,
          inventoryRecords: inventoryRows,
          hasData: inventoryRows.length > 0 || openingBalances.length > 0,
        };
      }),
    );

    return rows;
  }

  async ledgerBySupplier(supplierId: number) {
    const supplier = await this.suppliersRepo.findOne({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const inventoryRows = await this.inventoryRepo.find({
      where: { supplier_id: supplierId },
      order: { date: 'ASC' },
    });

    const payments = await this.millPaymentsRepo.find({
      where: { supplier_id: supplierId },
      order: { payment_date: 'ASC' },
    });

    const openingBalances = await this.openingBalancesRepo.find({
      where: { supplier_id: supplierId },
      order: { balance_date: 'ASC' },
    });

    const manualPayments = await this.manualPaymentsRepo.find({
      where: { supplier_id: supplierId },
      order: { payment_date: 'ASC' },
    });

    // Build chronological ledger entries
    type Entry = {
      id: string;
      date: Date;
      type: 'purchase' | 'payment' | 'opening';
      description: string;
      qty?: number;
      rate?: number;
      debit: number;
      credit: number;
      balance: number;
      inventory_id?: number;
      payment_status?: string;
    };

    const entries: Omit<Entry, 'balance'>[] = [
      ...openingBalances.map((ob) => ({
        id: `ob-${ob.id}`,
        date: new Date(ob.balance_date),
        type: 'opening' as const,
        description: ob.description,
        qty: undefined,
        rate: undefined,
        debit: ob.amount,
        credit: 0,
      })),
      ...inventoryRows.map((inv) => ({
        id: `inv-${inv.id}`,
        date: new Date(inv.date),
        type: 'purchase' as const,
        description: `${inv.product?.name ?? 'Product'}${inv.cement_brand?.brand_name ? ` (${inv.cement_brand.brand_name})` : ''}`,
        qty: inv.quantity_received,
        rate: inv.purchase_price_per_unit,
        debit: inv.total_cost,
        credit: 0,
        inventory_id: inv.id,
        payment_status: inv.payment_status,
      })),
      ...payments.map((p) => ({
        id: `pay-${p.id}`,
        date: new Date(p.payment_date),
        type: 'payment' as const,
        description: p.notes || 'Payment made',
        qty: undefined,
        rate: undefined,
        debit: 0,
        credit: p.amount_paid,
        inventory_id: p.inventory_id,
      })),
      // Implicit payments: amount paid at stock-in time not covered by explicit payment records
      ...inventoryRows
        .filter((inv) => inv.amount_paid_to_mill > 0)
        .map((inv) => {
          const explicitPaid = payments
            .filter((p) => p.inventory_id === inv.id)
            .reduce((s, p) => s + p.amount_paid, 0);
          const implicit = inv.amount_paid_to_mill - explicitPaid;
          return implicit > 0
            ? {
                id: `ipay-${inv.id}`,
                date: new Date(inv.date),
                type: 'payment' as const,
                description: 'Paid at stock-in',
                qty: undefined,
                rate: undefined,
                debit: 0,
                credit: implicit,
                inventory_id: inv.id,
              }
            : null;
        })
        .filter(Boolean) as Omit<Entry, 'balance'>[],
      ...manualPayments.map((mp) => ({
        id: `mpay-${mp.id}`,
        date: new Date(mp.payment_date),
        type: 'payment' as const,
        description: mp.description,
        qty: undefined,
        rate: undefined,
        debit: 0,
        credit: mp.amount,
        inventory_id: undefined,
      })),
    ];

    // Sort by date, purchases before payments on same day
    entries.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      return a.type === 'purchase' ? -1 : 1;
    });

    // Compute running balance
    let balance = 0;
    const ledger: Entry[] = entries.map((e) => {
      balance += e.debit - e.credit;
      return { ...e, balance };
    });

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    // Build product-wise summary
    type ProductRow = {
      productId: number;
      productName: string;
      brandName: string | null;
      totalQty: number;
      totalCost: number;
      totalPaid: number;
      balance: number;
    };
    const productMap = new Map<string, ProductRow>();
    for (const inv of inventoryRows) {
      const key = `${inv.product_id}-${inv.cement_brand_id ?? 0}`;
      const row = productMap.get(key);
      if (row) {
        row.totalQty += inv.quantity_received;
        row.totalCost += inv.total_cost;
        row.totalPaid += inv.amount_paid_to_mill;
        row.balance = row.totalCost - row.totalPaid;
      } else {
        productMap.set(key, {
          productId: inv.product_id,
          productName: inv.product?.name ?? 'Unknown',
          brandName: inv.cement_brand?.brand_name ?? null,
          totalQty: inv.quantity_received,
          totalCost: inv.total_cost,
          totalPaid: inv.amount_paid_to_mill,
          balance: inv.total_cost - inv.amount_paid_to_mill,
        });
      }
    }
    const productSummary = Array.from(productMap.values()).sort((a, b) =>
      a.productName.localeCompare(b.productName),
    );

    return {
      supplier,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      entries: ledger,
      productSummary,
    };
  }

  async addOpeningBalance(
    supplierId: number,
    body: { description: string; amount: number; balance_date: string; notes?: string },
  ) {
    const supplier = await this.suppliersRepo.findOne({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const record = this.openingBalancesRepo.create({
      supplier_id: supplierId,
      description: body.description,
      amount: body.amount,
      balance_date: body.balance_date,
      notes: body.notes,
    });
    return this.openingBalancesRepo.save(record);
  }

  async deleteOpeningBalance(id: number) {
    const record = await this.openingBalancesRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Opening balance not found');
    await this.openingBalancesRepo.remove(record);
    return { message: 'Deleted' };
  }

  async addManualPayment(
    supplierId: number,
    body: { description: string; amount: number; payment_date: string },
  ) {
    const supplier = await this.suppliersRepo.findOne({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const record = this.manualPaymentsRepo.create({
      supplier_id: supplierId,
      description: body.description,
      amount: body.amount,
      payment_date: body.payment_date,
    });
    return this.manualPaymentsRepo.save(record);
  }

  async deleteManualPayment(id: number) {
    const record = await this.manualPaymentsRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Manual payment not found');
    await this.manualPaymentsRepo.remove(record);
    return { message: 'Deleted' };
  }
}

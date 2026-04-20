import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory, InventoryPaymentStatus } from './entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepo: Repository<SaleItem>,
  ) {}

  async create(payload: CreateInventoryDto) {
    const totalCost = payload.quantity_received * payload.purchase_price_per_unit;
    const paid = Math.max(0, payload.amount_paid_to_mill ?? 0);
    const pending = Math.max(0, totalCost - paid);
    const payment_status =
      pending === 0
        ? InventoryPaymentStatus.PAID
        : paid > 0
          ? InventoryPaymentStatus.PARTIAL
          : InventoryPaymentStatus.PENDING;

    const entry = this.inventoryRepo.create({
      ...payload,
      total_cost: totalCost,
      amount_paid_to_mill: paid,
      amount_pending_to_mill: pending,
      payment_status,
      date: new Date(payload.date),
    });
    return this.inventoryRepo.save(entry);
  }

  history() {
    return this.inventoryRepo.find({ order: { date: 'DESC' } });
  }

  async stockSummary() {
    const receivedRows = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .select('inventory.product_id', 'product_id')
      .addSelect('SUM(inventory.quantity_received)', 'received')
      .groupBy('inventory.product_id')
      .getRawMany<{ product_id: number; received: string }>();

    const soldRows = await this.saleItemsRepo
      .createQueryBuilder('sale_item')
      .select('sale_item.product_id', 'product_id')
      .addSelect('SUM(sale_item.quantity)', 'sold')
      .groupBy('sale_item.product_id')
      .getRawMany<{ product_id: number; sold: string }>();

    const soldMap = new Map<number, number>(
      soldRows.map((row) => [Number(row.product_id), Number(row.sold)]),
    );

    const details = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .orderBy('inventory.created_at', 'DESC')
      .getMany();

    const latestByProduct = new Map<number, Inventory>();
    details.forEach((entry) => {
      if (!latestByProduct.has(entry.product_id)) {
        latestByProduct.set(entry.product_id, entry);
      }
    });

    return receivedRows.map((row) => {
      const productId = Number(row.product_id);
      const received = Number(row.received);
      const sold = soldMap.get(productId) ?? 0;
      const latest = latestByProduct.get(productId);
      return {
        product_id: productId,
        product: latest?.product,
        stock: received - sold,
        last_updated: latest?.created_at,
      };
    });
  }
}

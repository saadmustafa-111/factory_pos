import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import {
  Inventory,
  InventoryEntryType,
  InventoryPaymentStatus,
} from './entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepo: Repository<SaleItem>,
  ) {}

  async create(payload: CreateInventoryDto) {
    const isOpening = payload.entry_type === InventoryEntryType.OPENING;
    const totalCost =
      payload.quantity_received * payload.purchase_price_per_unit;
    const paid = isOpening
      ? totalCost
      : Math.max(0, payload.amount_paid_to_mill ?? 0);
    const receivedBack = isOpening
      ? 0
      : Math.max(0, payload.amount_received_from_mill ?? 0);
    const effectivePaid = Math.max(0, paid - receivedBack);
    const pending = isOpening ? 0 : Math.max(0, totalCost - effectivePaid);
    const overpayment = isOpening ? 0 : Math.max(0, effectivePaid - totalCost);
    const payment_status = isOpening
      ? InventoryPaymentStatus.PAID
      : pending === 0
        ? InventoryPaymentStatus.PAID
        : effectivePaid > 0
          ? InventoryPaymentStatus.PARTIAL
          : InventoryPaymentStatus.PENDING;

    const entry = this.inventoryRepo.create({
      ...payload,
      total_cost: totalCost,
      amount_paid_to_mill: paid,
      amount_received_from_mill: receivedBack,
      overpayment_amount: overpayment,
      amount_pending_to_mill: pending,
      payment_status,
      date: new Date(payload.date),
      pickup_date: payload.pickup_date
        ? new Date(payload.pickup_date)
        : undefined,
      delivery_date: payload.delivery_date
        ? new Date(payload.delivery_date)
        : undefined,
    });
    return this.inventoryRepo.save(entry);
  }

  async update(id: number, payload: CreateInventoryDto) {
    const entry = await this.inventoryRepo.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException('Inventory entry not found');
    }

    const isOpening = payload.entry_type === InventoryEntryType.OPENING;
    const totalCost =
      payload.quantity_received * payload.purchase_price_per_unit;
    const paid = isOpening
      ? totalCost
      : Math.max(0, payload.amount_paid_to_mill ?? 0);
    const receivedBack = isOpening
      ? 0
      : Math.max(0, payload.amount_received_from_mill ?? 0);
    const effectivePaid = Math.max(0, paid - receivedBack);
    const pending = isOpening ? 0 : Math.max(0, totalCost - effectivePaid);
    const overpayment = isOpening ? 0 : Math.max(0, effectivePaid - totalCost);
    const payment_status = isOpening
      ? InventoryPaymentStatus.PAID
      : pending === 0
        ? InventoryPaymentStatus.PAID
        : effectivePaid > 0
          ? InventoryPaymentStatus.PARTIAL
          : InventoryPaymentStatus.PENDING;

    Object.assign(entry, {
      ...payload,
      supplier_id: isOpening ? null : payload.supplier_id,
      cement_brand_id: payload.cement_brand_id ?? null,
      total_cost: totalCost,
      amount_paid_to_mill: paid,
      amount_received_from_mill: receivedBack,
      overpayment_amount: overpayment,
      amount_pending_to_mill: pending,
      payment_status,
      date: new Date(payload.date),
      pickup_date:
        !isOpening && payload.pickup_date
          ? new Date(payload.pickup_date)
          : null,
      delivery_date:
        !isOpening && payload.delivery_date
          ? new Date(payload.delivery_date)
          : null,
      delivery_location: !isOpening ? payload.delivery_location : null,
      transport_details: !isOpening ? payload.transport_details : null,
      credit_days: !isOpening ? payload.credit_days : null,
    });

    return this.inventoryRepo.save(entry);
  }

  history() {
    return this.inventoryRepo.find({ order: { date: 'DESC', id: 'DESC' } });
  }

  async delete(id: number) {
    const inventory = await this.inventoryRepo.findOne({ where: { id } });
    if (!inventory) {
      throw new NotFoundException('Inventory entry not found');
    }
    await this.inventoryRepo.remove(inventory);
    return { message: 'Inventory entry deleted successfully' };
  }

  async stockSummary() {
    const receivedRows = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .select('inventory.product_id', 'product_id')
      .addSelect('inventory.cement_brand_id', 'cement_brand_id')
      .addSelect('SUM(inventory.quantity_received)', 'received')
      .addSelect('SUM(inventory.total_cost)', 'received_value')
      .groupBy('inventory.product_id')
      .addGroupBy('inventory.cement_brand_id')
      .getRawMany<{
        product_id: number;
        cement_brand_id: number | null;
        received: string;
        received_value: string;
      }>();

    const soldRows = await this.saleItemsRepo
      .createQueryBuilder('sale_item')
      .select('sale_item.product_id', 'product_id')
      .addSelect('sale_item.cement_brand_id', 'cement_brand_id')
      .addSelect('SUM(sale_item.quantity)', 'sold')
      .groupBy('sale_item.product_id')
      .addGroupBy('sale_item.cement_brand_id')
      .getRawMany<{
        product_id: number;
        cement_brand_id: number | null;
        sold: string;
      }>();

    const rowKey = (productId: number, brandId?: number | null) =>
      `${productId}-${brandId ?? 0}`;

    const soldMap = new Map<string, number>(
      soldRows.map((row) => [
        rowKey(Number(row.product_id), row.cement_brand_id),
        Number(row.sold),
      ]),
    );

    // Current stock shows the latest non-zero Purchase Price/Unit entered for that product/brand.
    // If that entry lookup misses, fall back to stored totals so a priced purchase never appears as Rs 0.
    const details = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .leftJoinAndSelect('inventory.cement_brand', 'cement_brand')
      .orderBy('inventory.created_at', 'DESC')
      .getMany();

    const latestByKey = new Map<string, Inventory>();
    const latestPricedByKey = new Map<string, Inventory>();
    details.forEach((entry) => {
      const key = rowKey(entry.product_id, entry.cement_brand_id);
      if (!latestByKey.has(key)) {
        latestByKey.set(key, entry);
      }
      if (
        !latestPricedByKey.has(key) &&
        Number(entry.purchase_price_per_unit) > 0
      ) {
        latestPricedByKey.set(key, entry);
      }
    });

    return receivedRows.map((row) => {
      const productId = Number(row.product_id);
      const brandId =
        row.cement_brand_id == null ? null : Number(row.cement_brand_id);
      const key = rowKey(productId, brandId);
      const received = Number(row.received);
      const receivedValue = Number(row.received_value || 0);
      const sold = soldMap.get(key) ?? 0;
      const latest = latestByKey.get(key);
      const latestPriced = latestPricedByKey.get(key);
      const stock = received - sold;
      const fallbackUnitPrice = received > 0 ? receivedValue / received : 0;
      const unit_price = Number(
        latestPriced?.purchase_price_per_unit ?? fallbackUnitPrice,
      );
      const total_value = stock * unit_price;
      return {
        product_id: productId,
        cement_brand_id: brandId,
        product: latest?.product,
        cement_brand: latest?.cement_brand,
        stock,
        unit_price,
        total_value,
        last_updated: latest?.created_at,
      };
    });
  }
}

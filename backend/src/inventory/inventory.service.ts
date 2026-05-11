import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { Inventory, InventoryEntryType, InventoryPaymentStatus } from './entities/inventory.entity';

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
    const totalCost = payload.quantity_received * payload.purchase_price_per_unit;
    const paid = isOpening ? totalCost : Math.max(0, payload.amount_paid_to_mill ?? 0);
    const receivedBack = isOpening ? 0 : Math.max(0, payload.amount_received_from_mill ?? 0);
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
      pickup_date: payload.pickup_date ? new Date(payload.pickup_date) : undefined,
      delivery_date: payload.delivery_date ? new Date(payload.delivery_date) : undefined,
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

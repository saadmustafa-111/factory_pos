import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Sale } from '../sales/entities/sale.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepo: Repository<SaleItem>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
    @InjectRepository(Supplier)
    private readonly suppliersRepo: Repository<Supplier>,
  ) {}

  private async getAverageCostMap() {
    const costRows = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .select('inventory.product_id', 'product_id')
      .addSelect(
        'SUM(inventory.total_cost) / NULLIF(SUM(inventory.quantity_received), 0)',
        'avg_cost',
      )
      .groupBy('inventory.product_id')
      .getRawMany<{ product_id: number; avg_cost: string }>();

    return new Map<number, number>(
      costRows.map((row) => [Number(row.product_id), Number(row.avg_cost)]),
    );
  }

  async dashboard() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySales, monthSales, allSales] = await Promise.all([
      this.salesRepo
        .createQueryBuilder('sale')
        .select('COALESCE(SUM(sale.total_amount), 0)', 'total')
        .where('sale.date >= :todayStart', { todayStart })
        .getRawOne<{ total: string }>(),
      this.salesRepo
        .createQueryBuilder('sale')
        .select('COALESCE(SUM(sale.total_amount), 0)', 'total')
        .where('sale.date >= :monthStart', { monthStart })
        .getRawOne<{ total: string }>(),
      this.salesRepo.find(),
    ]);

    const totalPending = allSales.reduce((sum, sale) => sum + sale.pending_amount, 0);
    const overdueSales = allSales.filter((sale) => sale.is_overdue);
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const dueThisWeek = allSales.filter(
      (sale) => !!sale.due_date && sale.due_date >= now && sale.due_date <= weekEnd,
    );
    const suppliers = await this.suppliersRepo.find({ relations: ['inventoryEntries'] });
    const millDues = suppliers.reduce(
      (sum, supplier) =>
        sum +
        (supplier.inventoryEntries || []).reduce(
          (inner, item) => inner + (item.amount_pending_to_mill || 0),
          0,
        ),
      0,
    );
    const totalProfit = await this.totalProfit();
    const stock = await this.stock();

    return {
      todaySales: Number(todaySales?.total ?? 0),
      monthSales: Number(monthSales?.total ?? 0),
      customerPending: totalPending,
      millDues,
      overdueCount: overdueSales.length,
      totalProfit,
      overdueSales,
      dueThisWeek,
      stockSummary: stock,
      recentSales: allSales.sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 5),
    };
  }

  async stock() {
    const receivedRows = await this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .select('inventory.product_id', 'product_id')
      .addSelect('product.name', 'name')
      .addSelect('product.unit', 'unit')
      .addSelect('COALESCE(SUM(inventory.quantity_received), 0)', 'received')
      .groupBy('inventory.product_id')
      .addGroupBy('product.name')
      .addGroupBy('product.unit')
      .getRawMany<{ product_id: number; name: string; unit: string; received: string }>();

    const soldRows = await this.saleItemsRepo
      .createQueryBuilder('sale_item')
      .select('sale_item.product_id', 'product_id')
      .addSelect('COALESCE(SUM(sale_item.quantity), 0)', 'sold')
      .groupBy('sale_item.product_id')
      .getRawMany<{ product_id: number; sold: string }>();

    const soldMap = new Map<number, number>(
      soldRows.map((row) => [Number(row.product_id), Number(row.sold)]),
    );

    return receivedRows.map((row) => {
      const sold = soldMap.get(Number(row.product_id)) ?? 0;
      return {
        product_id: Number(row.product_id),
        product_name: row.name,
        unit: row.unit,
        current_stock: Number(row.received) - sold,
      };
    });
  }

  async profit(from?: string, to?: string) {
    const qb = this.saleItemsRepo
      .createQueryBuilder('sale_item')
      .leftJoinAndSelect('sale_item.product', 'product')
      .leftJoinAndSelect('sale_item.sale', 'sale');

    if (from) {
      qb.andWhere('sale.date >= :from', { from: new Date(from) });
    }
    if (to) {
      qb.andWhere('sale.date <= :to', { to: new Date(to) });
    }

    const items = await qb.getMany();
    const avgCostMap = await this.getAverageCostMap();

    const byProduct = new Map<
      number,
      { product: string; quantity: number; sales: number; cost: number; profit: number }
    >();

    items.forEach((item) => {
      const productId = item.product_id;
      const existing = byProduct.get(productId) ?? {
        product: item.product.name,
        quantity: 0,
        sales: 0,
        cost: 0,
        profit: 0,
      };

      const avgCost = avgCostMap.get(productId) ?? 0;
      const cost = avgCost * item.quantity;
      existing.quantity += item.quantity;
      existing.sales += item.total_price;
      existing.cost += cost;
      existing.profit += item.total_price - cost;

      byProduct.set(productId, existing);
    });

    return Array.from(byProduct.values());
  }

  async totalProfit() {
    const rows = await this.profit();
    return rows.reduce((sum, row) => sum + row.profit, 0);
  }
}

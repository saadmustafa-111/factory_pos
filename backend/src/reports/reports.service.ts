import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../inventory/entities/inventory.entity';
import { MillPayment } from '../mill-payments/entities/mill-payment.entity';
import { Expense } from '../expenses/entities/expense.entity';
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
    @InjectRepository(MillPayment)
    private readonly millPaymentRepo: Repository<MillPayment>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
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

    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    // Use local calendar date (not UTC) for DATE() comparisons in SQLite
    const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [todaySales, monthSales, allSales, todayStockRow, todayMillRow, todayExpenseRow, todayExpenseCats] = await Promise.all([
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
      // Today's stock/purchase cost
      this.inventoryRepo
        .createQueryBuilder('inv')
        .select('COALESCE(SUM(inv.total_cost), 0)', 'total')
        .where('inv.date >= :todayStart AND inv.date <= :todayEnd', { todayStart, todayEnd })
        .getRawOne<{ total: string }>(),
      // Today's mill payments actually sent out
      this.millPaymentRepo
        .createQueryBuilder('mp')
        .select('COALESCE(SUM(mp.amount_paid), 0)', 'total')
        .where('mp.payment_date >= :todayStart AND mp.payment_date <= :todayEnd', { todayStart, todayEnd })
        .getRawOne<{ total: string }>(),
      // Today's manual expenses (transport, labour, etc.)
      this.expenseRepo
        .createQueryBuilder('exp')
        .select('COALESCE(SUM(exp.amount), 0)', 'total')
        .where('DATE(exp.date) = :today', { today: todayLocalStr })
        .getRawOne<{ total: string }>(),
      // Today's manual expenses broken down by category
      this.expenseRepo
        .createQueryBuilder('exp')
        .select('exp.category', 'category')
        .addSelect('COALESCE(SUM(exp.amount), 0)', 'total')
        .where('DATE(exp.date) = :today', { today: todayLocalStr })
        .groupBy('exp.category')
        .getRawMany<{ category: string; total: string }>(),
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

    const todaySalesAmt = Number(todaySales?.total ?? 0);
    const todayStockCost = Number(todayStockRow?.total ?? 0);
    const todayMillPaid = Number(todayMillRow?.total ?? 0);
    const todayManualExpenses = Number(todayExpenseRow?.total ?? 0);
    const todayExpenseBreakdown: Record<string, number> = {};
    for (const row of (todayExpenseCats ?? [])) {
      todayExpenseBreakdown[row.category] = Number(row.total);
    }
    const todayExpenses = todayStockCost + todayMillPaid + todayManualExpenses;
    const todayNet = todaySalesAmt - todayExpenses;

    return {
      todaySales: todaySalesAmt,
      todayStockCost,
      todayMillPaid,
      todayManualExpenses,
      todayExpenseBreakdown,
      todayExpenses,
      todayNet,
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

    // Fetch total expenses for the same period
    const expQb = this.expenseRepo.createQueryBuilder('exp');
    if (from) expQb.andWhere('DATE(exp.date) >= :from', { from });
    if (to) expQb.andWhere('DATE(exp.date) <= :to', { to });
    const expenseRows = await expQb.getMany();
    const totalExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);

    // Pre-compute items subtotal per sale (for proportional discount distribution)
    const saleSubtotals = new Map<number, number>();
    items.forEach((item) => {
      const cur = saleSubtotals.get(item.sale_id) ?? 0;
      saleSubtotals.set(item.sale_id, cur + item.total_price);
    });

    const byProduct = new Map<
      number,
      { product: string; quantity: number; gross_sales: number; discount: number; sales: number; cost: number; profit: number }
    >();

    items.forEach((item) => {
      const productId = item.product_id;
      const existing = byProduct.get(productId) ?? {
        product: item.product.name,
        quantity: 0,
        gross_sales: 0,
        discount: 0,
        sales: 0,
        cost: 0,
        profit: 0,
      };

      // Distribute sale-level discount proportionally to this item
      const saleDiscount = item.sale?.discount ?? 0;
      const saleSubtotal = saleSubtotals.get(item.sale_id) ?? 0;
      const itemDiscount = saleSubtotal > 0 ? saleDiscount * (item.total_price / saleSubtotal) : 0;
      const netSales = item.total_price - itemDiscount;

      const avgCost = avgCostMap.get(productId) ?? 0;
      const cost = avgCost * item.quantity;
      existing.quantity += item.quantity;
      existing.gross_sales += item.total_price;
      existing.discount += itemDiscount;
      existing.sales += netSales;
      existing.cost += cost;
      existing.profit += netSales - cost;

      byProduct.set(productId, existing);
    });

    const rows = Array.from(byProduct.values());
    const grossProfit = rows.reduce((s, r) => s + r.profit, 0);

    return {
      rows,
      totalExpenses,
      grossProfit,
      netProfit: grossProfit - totalExpenses,
    };
  }

  async totalProfit() {
    const result = await this.profit();
    return result.netProfit;
  }
}

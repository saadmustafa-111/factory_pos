import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DailyRegisterService {
  constructor(private readonly dataSource: DataSource) {}

  private dateRange(from?: string, to?: string): { from: string; to: string } {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);
    return { from: from ?? defaultFrom, to: to ?? defaultTo };
  }

  // ─── SUMMARY LIST ─────────────────────────────────────────────────────────

  async getDailyRegister(from?: string, to?: string) {
    const range = this.dateRange(from, to);

    // Sales per day
    const salesRows = await this.dataSource.query(
      `SELECT
         DATE(s.date) as date,
         COUNT(s.id) as sales_count,
         COALESCE(SUM(s.total_amount), 0) as sales_amount,
         COALESCE(SUM(s.paid_amount), 0) as cash_received,
         COALESCE(SUM(s.pending_amount), 0) as credit_given
       FROM sales s
       WHERE DATE(s.date) BETWEEN ? AND ?
       GROUP BY DATE(s.date)`,
      [range.from, range.to],
    );

    // Payments collected per day (from customer_payments table - existing system)
    const oldPayRows = await this.dataSource.query(
      `SELECT
         DATE(cp.payment_date) as date,
         COALESCE(SUM(cp.amount_paid), 0) as payments_collected
       FROM customer_payments cp
       WHERE DATE(cp.payment_date) BETWEEN ? AND ?
       GROUP BY DATE(cp.payment_date)`,
      [range.from, range.to],
    );

    // Installment payments collected per day (new system)
    const instPayRows = await this.dataSource.query(
      `SELECT
         DATE(ip.payment_date) as date,
         COALESCE(SUM(ip.amount), 0) as payments_collected
       FROM installment_payments ip
       WHERE DATE(ip.payment_date) BETWEEN ? AND ?
       GROUP BY DATE(ip.payment_date)`,
      [range.from, range.to],
    );

    // Stock added per day
    const stockRows = await this.dataSource.query(
      `SELECT
         DATE(i.date) as date,
         COUNT(i.id) as stock_count,
         COALESCE(SUM(i.total_cost), 0) as stock_value
       FROM inventory i
       WHERE DATE(i.date) BETWEEN ? AND ?
       GROUP BY DATE(i.date)`,
      [range.from, range.to],
    );

    // Profit per day (sale_price - purchase_price)
    const profitRows = await this.dataSource.query(
      `SELECT
         DATE(s.date) as date,
         COALESCE(SUM((si.sale_price_per_unit - si.purchase_price_per_unit) * si.quantity), 0) as profit
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       WHERE DATE(s.date) BETWEEN ? AND ?
       GROUP BY DATE(s.date)`,
      [range.from, range.to],
    );

    // Merge all into map
    const map = new Map<
      string,
      {
        date: string;
        sales_count: number;
        sales_amount: number;
        cash_received: number;
        credit_given: number;
        payments_collected: number;
        stock_added_count: number;
        stock_added_value: number;
        net_profit: number;
      }
    >();

    const ensure = (date: string) => {
      if (!map.has(date)) {
        map.set(date, {
          date,
          sales_count: 0,
          sales_amount: 0,
          cash_received: 0,
          credit_given: 0,
          payments_collected: 0,
          stock_added_count: 0,
          stock_added_value: 0,
          net_profit: 0,
        });
      }
      return map.get(date)!;
    };

    for (const row of salesRows) {
      const d = ensure(row.date);
      d.sales_count = Number(row.sales_count);
      d.sales_amount = Number(row.sales_amount);
      d.cash_received = Number(row.cash_received);
      d.credit_given = Number(row.credit_given);
    }
    for (const row of oldPayRows) {
      ensure(row.date).payments_collected += Number(row.payments_collected);
    }
    for (const row of instPayRows) {
      ensure(row.date).payments_collected += Number(row.payments_collected);
    }
    for (const row of stockRows) {
      const d = ensure(row.date);
      d.stock_added_count = Number(row.stock_count);
      d.stock_added_value = Number(row.stock_value);
    }
    for (const row of profitRows) {
      ensure(row.date).net_profit = Number(row.profit);
    }

    return Array.from(map.values()).sort((a, b) =>
      b.date.localeCompare(a.date),
    );
  }

  // ─── DAILY DETAIL ─────────────────────────────────────────────────────────

  async getDailyDetail(date: string) {
    // Sales
    const sales = await this.dataSource.query(
      `SELECT
         s.id,
         s.customer_name,
         COALESCE(c.name, s.customer_name) as customer_display,
         COALESCE(c.phone, s.customer_phone) as customer_phone,
         COALESCE(c.address, '') as customer_address,
         s.total_amount,
         s.paid_amount,
         s.pending_amount,
         s.status,
         s.is_overdue,
         s.notes,
         CASE
           WHEN s.pending_amount <= 0 THEN 'cash'
           WHEN s.credit_days > 0 THEN 'credit'
           ELSE 'credit'
         END as payment_type
       FROM sales s
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE DATE(s.date) = ?
       ORDER BY s.id DESC`,
      [date],
    );

    // Sale items per sale
    const saleIds: number[] = sales.map((s: any) => Number(s.id));
    const allItems: any[] = saleIds.length
      ? await this.dataSource.query(
          `SELECT si.sale_id, p.name as product, si.quantity, p.unit, si.sale_price_per_unit as rate,
                  si.quantity * si.sale_price_per_unit as total,
                  cb.brand_name as brand
           FROM sale_items si
           JOIN products p ON p.id = si.product_id
           LEFT JOIN cement_brands cb ON cb.id = si.cement_brand_id
           WHERE si.sale_id IN (${saleIds.map(() => '?').join(',')})`,
          saleIds,
        )
      : [];

    const itemsBySale = new Map<number, any[]>();
    for (const item of allItems) {
      const id = Number(item.sale_id);
      if (!itemsBySale.has(id)) itemsBySale.set(id, []);
      itemsBySale.get(id)!.push({
        product: item.brand ? `${item.product} (${item.brand})` : item.product,
        qty: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        total: Number(item.total),
      });
    }

    const formattedSales = sales.map((s: any) => ({
      id: Number(s.id),
      customer_name: s.customer_display || s.customer_name || 'Walk-in',
      customer_phone: s.customer_phone || null,
      customer_address: s.customer_address || null,
      notes: s.notes || null,
      items: itemsBySale.get(Number(s.id)) ?? [],
      total_amount: Number(s.total_amount),
      paid_amount: Number(s.paid_amount),
      remaining_amount: Number(s.pending_amount),
      payment_type: Number(s.pending_amount) <= 0 ? 'cash' : 'credit',
      status: s.is_overdue ? 'overdue' : s.status,
    }));

    // Stock movements
    const stock = await this.dataSource.query(
      `SELECT
         COALESCE(sup.name, 'Unknown') as supplier,
         p.name as product,
         COALESCE(cb.brand_name, '') as brand,
         i.quantity_received as quantity,
         p.unit,
         i.purchase_price_per_unit as purchase_rate,
         i.total_cost as total_value
       FROM inventory i
       JOIN products p ON p.id = i.product_id
       LEFT JOIN suppliers sup ON sup.id = i.supplier_id
       LEFT JOIN cement_brands cb ON cb.id = i.cement_brand_id
       WHERE DATE(i.date) = ?
       ORDER BY i.id DESC`,
      [date],
    );

    // Payments received (old system + new installment system)
    const oldPayments = await this.dataSource.query(
      `SELECT
         COALESCE(c.name, 'Unknown') as customer_name,
         cp.amount_paid as amount,
         'cash' as method,
         cp.notes
       FROM customer_payments cp
       LEFT JOIN customers c ON c.id = cp.customer_id
       WHERE DATE(cp.payment_date) = ?`,
      [date],
    );

    const instPayments = await this.dataSource.query(
      `SELECT
         COALESCE(c.name, 'Unknown') as customer_name,
         ip.amount,
         ip.payment_method as method,
         ip.notes
       FROM installment_payments ip
       LEFT JOIN customers c ON c.id = ip.customer_id
       WHERE DATE(ip.payment_date) = ?`,
      [date],
    );

    const paymentsReceived = [
      ...oldPayments.map((p: any) => ({ ...p, amount: Number(p.amount) })),
      ...instPayments.map((p: any) => ({ ...p, amount: Number(p.amount) })),
    ];

    // Summary totals
    interface FormattedSale {
      total_amount: number;
      paid_amount: number;
      remaining_amount: number;
      payment_type: string;
    }
    const fSales = formattedSales as FormattedSale[];
    const totalSales = fSales.reduce(
      (s: number, r: FormattedSale) => s + r.total_amount,
      0,
    );
    const cashCollected = fSales
      .filter((s: FormattedSale) => s.payment_type === 'cash')
      .reduce((s: number, r: FormattedSale) => s + r.paid_amount, 0);
    const creditGiven = fSales.reduce(
      (s: number, r: FormattedSale) => s + r.remaining_amount,
      0,
    );
    const stockValue = (stock as { total_value: unknown }[]).reduce(
      (s: number, r: { total_value: unknown }) => s + Number(r.total_value),
      0,
    );

    const profitRows = await this.dataSource.query(
      `SELECT COALESCE(SUM((si.sale_price_per_unit - si.purchase_price_per_unit) * si.quantity), 0) as profit
       FROM sales s JOIN sale_items si ON si.sale_id = s.id WHERE DATE(s.date) = ?`,
      [date],
    );

    return {
      date,
      sales: formattedSales,
      stock_movements: stock.map((s: any) => ({
        supplier: s.supplier,
        product: s.brand ? `${s.product} (${s.brand})` : s.product,
        quantity: Number(s.quantity),
        unit: s.unit,
        purchase_rate: Number(s.purchase_rate),
        total_value: Number(s.total_value),
      })),
      payments_received: paymentsReceived,
      summary: {
        total_sales: totalSales,
        cash_collected: cashCollected,
        credit_given: creditGiven,
        stock_value: stockValue,
        profit: Number(profitRows[0]?.profit ?? 0),
        payments_collected: paymentsReceived.reduce((s, r) => s + r.amount, 0),
      },
    };
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CustomerLedger } from './entities/customer-ledger.entity';
import { InstallmentDue } from './entities/installment-due.entity';
import { InstallmentPayment } from './entities/installment-payment.entity';
import { InstallmentPlan } from './entities/installment-plan.entity';
import { CustomerManualCredit } from './entities/customer-manual-credit.entity';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class CustomerLedgerService {
  private readonly logger = new Logger(CustomerLedgerService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(CustomerLedger)
    private readonly ledgerRepo: Repository<CustomerLedger>,
    @InjectRepository(InstallmentPlan)
    private readonly plansRepo: Repository<InstallmentPlan>,
    @InjectRepository(InstallmentDue)
    private readonly duesRepo: Repository<InstallmentDue>,
    @InjectRepository(InstallmentPayment)
    private readonly paymentsRepo: Repository<InstallmentPayment>,
    @InjectRepository(CustomerManualCredit)
    private readonly manualCreditsRepo: Repository<CustomerManualCredit>,
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Payment)
    private readonly salePaymentsRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── CRON — Mark overdue every night at 1 AM ─────────────────────────────

  @Cron('0 1 * * *')
  async markOverdueInstallments(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    // Update dues to overdue
    const duesResult = await this.dataSource.query(
      `UPDATE installment_due SET status = 'overdue'
       WHERE due_date < ? AND status IN ('pending', 'partial')`,
      [today],
    );
    this.logger.log(`Marked overdue dues: ${duesResult?.changes ?? 0}`);

    // Update plans whose any due is overdue
    await this.dataSource.query(
      `UPDATE installment_plan SET status = 'overdue'
       WHERE status = 'active' AND id IN (
         SELECT DISTINCT installment_plan_id FROM installment_due WHERE status = 'overdue'
       )`,
    );
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

  private async getOrCreateLedger(customerId: number): Promise<CustomerLedger> {
    let ledger = await this.ledgerRepo.findOne({ where: { customer_id: customerId } });
    if (!ledger) {
      ledger = this.ledgerRepo.create({ customer_id: customerId });
      ledger = await this.ledgerRepo.save(ledger);
    }
    return ledger;
  }

  // ─── LIST WITH FILTERS ────────────────────────────────────────────────────

  async getLedgerList(type: string = 'all', status: string = 'all') {
    const customers = await this.customersRepo.find({ order: { name: 'ASC' } });

    const results = await Promise.all(
      customers.map(async (customer) => {
        const ledger = await this.ledgerRepo.findOne({ where: { customer_id: customer.id } });

        // Overdue installment summary
        const overdueDues = await this.duesRepo
          .createQueryBuilder('d')
          .innerJoin('installment_plan', 'p', 'p.id = d.installment_plan_id')
          .where('p.customer_id = :cid', { cid: customer.id })
          .andWhere("d.status = 'overdue'")
          .getMany();

        const overdueAmount = overdueDues.reduce((s, d) => s + (d.due_amount - d.paid_amount), 0);

        // Next due
        const nextDue = await this.duesRepo
          .createQueryBuilder('d')
          .innerJoin('installment_plan', 'p', 'p.id = d.installment_plan_id')
          .where('p.customer_id = :cid', { cid: customer.id })
          .andWhere("d.status IN ('pending', 'partial')")
          .orderBy('d.due_date', 'ASC')
          .getOne();

        // Sales pending amount (unpaid balance from direct sales)
        const salesPendingRes = await this.dataSource.query(
          `SELECT COALESCE(SUM(s.pending_amount), 0) as total_pending FROM sales s WHERE s.customer_id = ? AND s.status != 'paid'`,
          [customer.id],
        );
        const salesPending = Number(salesPendingRes[0]?.total_pending ?? 0);

        // Manual credit pending (amount - paid_amount)
        const manualCreditPendingRes = await this.dataSource.query(
          `SELECT COALESCE(SUM(amount - paid_amount), 0) as total_pending FROM customer_manual_credits WHERE customer_id = ?`,
          [customer.id],
        );
        const manualCreditPending = Number(manualCreditPendingRes[0]?.total_pending ?? 0);

        // Last purchase / payment dates from sales
        const lastSale = await this.dataSource.query(
          `SELECT MAX(s.date) as last_date FROM sales s WHERE s.customer_id = ?`,
          [customer.id],
        );
        const lastPayment = await this.dataSource.query(
          `SELECT MAX(cp.payment_date) as last_date FROM customer_payments cp WHERE cp.customer_id = ?`,
          [customer.id],
        );
        const lastInstPayment = await this.paymentsRepo.findOne({
          where: { customer_id: customer.id },
          order: { id: 'DESC' },
        });

        const custLedger = ledger ?? {
          customer_type: 'cash',
          total_purchased: 0,
          total_paid: 0,
          remaining_balance: 0,
          credit_limit: 0,
          payment_term_days: 30,
        };

        const ledgerBalance = Number(custLedger.remaining_balance ?? 0);
        const effectiveBalance = Math.max(ledgerBalance, salesPending + manualCreditPending);
        const effectiveStatus =
          overdueAmount > 0 ? 'overdue' : (effectiveBalance > 0 ? 'active' : 'clear');

        return {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          customer_type: custLedger.customer_type,
          credit_limit: custLedger.credit_limit,
          payment_term_days: custLedger.payment_term_days,
          total_purchased: custLedger.total_purchased,
          total_paid: custLedger.total_paid,
          remaining_balance: effectiveBalance,
          sales_pending: salesPending,
          overdue_amount: overdueAmount,
          overdue_installments: overdueDues.length,
          last_purchase_date: lastSale[0]?.last_date ?? null,
          last_payment_date:
            lastInstPayment?.payment_date ??
            lastPayment[0]?.last_date ??
            null,
          next_due_date: nextDue?.due_date ?? null,
          next_due_amount: nextDue ? nextDue.due_amount - nextDue.paid_amount : null,
          status: effectiveStatus,
          created_at: customer.created_at,
          // New fields
          vehicle_number: customer.vehicle_number,
          cnic: customer.cnic,
          relation_with_me: customer.relation_with_me,
          image_url: customer.image_url,
        };
      }),
    );

    let filtered = results;
    if (type !== 'all') filtered = filtered.filter((r) => r.customer_type === type);
    if (status === 'overdue') filtered = filtered.filter((r) => r.status === 'overdue');
    else if (status === 'active') filtered = filtered.filter((r) => r.status === 'active');

    return filtered;
  }

  // ─── UDHAR BOOK (all outstanding credit, sorted by highest balance) ────────

  async getUdharBook() {
    // Fetch all customers who have pending balance in sales
    const rows = await this.dataSource.query(
      `SELECT
         c.id as customer_id,
         c.name as customer_name,
         c.phone as customer_phone,
         c.address as customer_address,
         s.id as sale_id,
         s.date as sale_date,
         s.total_amount,
         s.paid_amount,
         s.pending_amount,
         s.status as sale_status,
         s.due_date,
         group_concat(
           p.name ||
           CASE WHEN cb.brand_name IS NOT NULL THEN ' (' || cb.brand_name || ')' ELSE '' END ||
           ' x' || CAST(si.quantity AS TEXT) || ' ' || p.unit,
           ', '
         ) as items_summary
       FROM sales s
       JOIN customers c ON c.id = s.customer_id
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       LEFT JOIN cement_brands cb ON cb.id = si.cement_brand_id
       WHERE s.pending_amount > 0
         AND s.status != 'paid'
       GROUP BY s.id
       ORDER BY s.pending_amount DESC`,
    );

    // Group by customer, aggregate total pending per customer
    const customerMap = new Map<number, {
      customer_id: number;
      customer_name: string;
      customer_phone: string;
      customer_address: string;
      total_pending: number;
      sales: any[];
    }>();

    for (const row of rows) {
      if (!customerMap.has(row.customer_id)) {
        customerMap.set(row.customer_id, {
          customer_id: row.customer_id,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_address: row.customer_address,
          total_pending: 0,
          sales: [],
        });
      }
      const entry = customerMap.get(row.customer_id)!;
      entry.total_pending += Number(row.pending_amount);
      entry.sales.push({
        sale_id: row.sale_id,
        sale_date: row.sale_date,
        total_amount: Number(row.total_amount),
        paid_amount: Number(row.paid_amount),
        pending_amount: Number(row.pending_amount),
        sale_status: row.sale_status,
        due_date: row.due_date,
        items_summary: row.items_summary,
      });
    }

    // Sort customers by highest total_pending first
    return Array.from(customerMap.values())
      .sort((a, b) => b.total_pending - a.total_pending);
  }

  // ─── CUSTOMER DETAIL ──────────────────────────────────────────────────────

  async getCustomerDetail(customerId: number) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const ledger = await this.getOrCreateLedger(customerId);

    // Active installment plans with dues
    const plans = await this.plansRepo.find({
      where: { customer_id: customerId },
      relations: ['installment_dues'],
      order: { created_at: 'DESC' },
    });
    plans.forEach((p) =>
      p.installment_dues.sort((a, b) => a.installment_number - b.installment_number),
    );

    // Payment history
    const payments = await this.paymentsRepo.find({
      where: { customer_id: customerId },
      order: { id: 'DESC' },
    });

    const salePayments = await this.salePaymentsRepo.find({
      where: { customer_id: customerId },
      order: { payment_date: 'DESC' },
    });

    // Purchase history (sales)
    const sales = await this.dataSource.query(
      `SELECT s.id, s.date, s.total_amount, s.paid_amount, s.pending_amount, s.status,
              group_concat(p.name || ' x' || si.quantity, ', ') as items_summary
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       WHERE s.customer_id = ?
       GROUP BY s.id
       ORDER BY s.date DESC`,
      [customerId],
    );

    // Manual (previous) credits
    const manualCredits = await this.manualCreditsRepo.find({
      where: { customer_id: customerId },
      order: { credit_date: 'DESC' },
    });

    // ── Compute paid distribution for manual credits directly from mc.paid_amount ──
    const salesPaid = sales.reduce((sum: number, s: any) => sum + Number(s.paid_amount || 0), 0);
    const manualTotal = manualCredits.reduce((sum, mc) => sum + mc.amount, 0);

    // Merge sales + manual credits into one purchase history, sorted by date desc
    const purchaseHistory = [
      ...sales.map((s: any) => ({
        id: s.id,
        date: s.date,
        total_amount: Number(s.total_amount),
        paid_amount: Number(s.paid_amount),
        pending_amount: Number(s.pending_amount),
        status: s.status,
        items_summary: s.items_summary,
        source: 'sale',
      })),
      ...manualCredits.map((mc) => {
        const pendingAmt = mc.amount - mc.paid_amount;
        return {
          id: mc.id,
          date: mc.credit_date,
          total_amount: mc.amount,
          paid_amount: mc.paid_amount,
          pending_amount: pendingAmt,
          status: pendingAmt <= 0 ? 'paid' : mc.paid_amount > 0 ? 'partial' : 'pending',
          items_summary: mc.item_description,
          notes: mc.notes,
          source: 'manual',
        };
      }),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    // Overdue summary
    const overdueDues = await this.duesRepo
      .createQueryBuilder('d')
      .innerJoin('installment_plan', 'p', 'p.id = d.installment_plan_id')
      .where('p.customer_id = :cid', { cid: customerId })
      .andWhere("d.status = 'overdue'")
      .getMany();

    const overdueAmount = overdueDues.reduce((s, d) => s + (d.due_amount - d.paid_amount), 0);

    // ── Live summary computed from actual sales + manual credits ──────────────
    const salesTotal = sales.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
    const salesPending = sales.reduce((sum: number, s: any) => sum + Number(s.pending_amount || 0), 0);
    const manualPaymentsApplied = manualCredits.reduce((sum, mc) => sum + mc.paid_amount, 0);
    const totalPurchased = salesTotal + manualTotal;
    const totalPaid = salesPaid + manualPaymentsApplied;
    const remainingBalance = salesPending + (manualTotal - manualPaymentsApplied);

    return {
      customer: {
        ...customer,
        customer_type: ledger.customer_type,
        credit_limit: ledger.credit_limit,
        payment_term_days: ledger.payment_term_days,
      },
      summary: {
        total_purchased: totalPurchased,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        overdue_amount: overdueAmount,
        overdue_installments: overdueDues.length,
      },
      installment_plans: plans,
      payment_history: [
        ...payments.map((p) => ({
          id: `installment-${p.id}`,
          amount: p.amount,
          discount_amount: p.discount_amount || 0,
          total_credit: Number(p.amount || 0) + Number(p.discount_amount || 0),
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          notes: p.notes,
        })),
        ...salePayments.map((p) => ({
          id: `sale-${p.id}`,
          amount: p.amount_paid,
          amount_paid: p.amount_paid,
          discount_amount: p.discount_amount || 0,
          total_credit: Number(p.amount_paid || 0) + Number(p.discount_amount || 0),
          payment_date: p.payment_date,
          payment_method: 'cash',
          notes: p.notes,
        })),
      ].sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1)),
      purchase_history: purchaseHistory,
    };
  }

  // ─── ADD MANUAL (PREVIOUS) CREDIT ────────────────────────────────────────

  async addManualCredit(
    customerId: number,
    body: { item_description: string; amount: number; credit_date: string; notes?: string },
  ) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const record = this.manualCreditsRepo.create({
      customer_id: customerId,
      item_description: body.item_description,
      amount: body.amount,
      credit_date: body.credit_date,
      notes: body.notes ?? null!,
    });
    await this.manualCreditsRepo.save(record);

    // Bump ledger balance
    const ledger = await this.getOrCreateLedger(customerId);
    ledger.total_purchased += body.amount;
    ledger.remaining_balance = Math.max(0, ledger.total_purchased - ledger.total_paid);
    await this.ledgerRepo.save(ledger);

    return { success: true, id: record.id };
  }

  async updateManualCredit(
    customerId: number,
    creditId: number,
    body: { item_description: string; amount: number; credit_date: string; notes?: string },
  ) {
    const record = await this.manualCreditsRepo.findOne({
      where: { id: creditId, customer_id: customerId },
    });
    if (!record) throw new NotFoundException('Manual credit not found');

    record.item_description = body.item_description;
    record.amount = body.amount;
    record.credit_date = body.credit_date;
    record.notes = body.notes ?? null!;
    await this.manualCreditsRepo.save(record);

    const detail = await this.getCustomerDetail(customerId);
    const ledger = await this.getOrCreateLedger(customerId);
    ledger.total_purchased = detail.summary.total_purchased;
    ledger.total_paid = detail.summary.total_paid;
    ledger.remaining_balance = detail.summary.remaining_balance;
    await this.ledgerRepo.save(ledger);

    return { success: true, id: record.id };
  }

  // ─── CREATE INSTALLMENT PLAN ──────────────────────────────────────────────

  async createInstallmentPlan(
    customerId: number,
    body: {
      total_amount: number;
      down_payment: number;
      number_of_installments: number;
      start_date: string;
      sale_id?: number;
      description?: string;
      notes?: string;
    },
  ) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const remaining = body.total_amount - (body.down_payment ?? 0);
    if (remaining <= 0) throw new BadRequestException('Remaining amount must be > 0');

    const installmentAmount = remaining / body.number_of_installments;

    const plan = new InstallmentPlan();
    plan.customer_id = customerId;
    plan.sale_id = body.sale_id ?? null!;
    plan.description = body.description ?? '';
    plan.total_amount = body.total_amount;
    plan.down_payment = body.down_payment ?? 0;
    plan.paid_amount = body.down_payment ?? 0;
    plan.remaining_amount = remaining;
    plan.number_of_installments = body.number_of_installments;
    plan.start_date = body.start_date;
    plan.status = 'active';
    plan.notes = body.notes ?? null!;
    const savedPlan = await this.plansRepo.save(plan);

    // Auto-generate due records — monthly intervals
    const startDate = new Date(body.start_date);
    const dues: InstallmentDue[] = [];
    for (let i = 0; i < body.number_of_installments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      dues.push(
        this.duesRepo.create({
          installment_plan_id: savedPlan.id,
          installment_number: i + 1,
          due_date: dueDate.toISOString().slice(0, 10),
          due_amount: Math.round(installmentAmount * 100) / 100,
          paid_amount: 0,
          status: 'pending',
        }),
      );
    }
    await this.duesRepo.save(dues);

    // Update ledger
    const ledger = await this.getOrCreateLedger(customerId);
    ledger.customer_type = 'installment';
    ledger.total_purchased += body.total_amount;
    ledger.total_paid += body.down_payment ?? 0;
    ledger.remaining_balance = Math.max(0, ledger.total_purchased - ledger.total_paid);
    await this.ledgerRepo.save(ledger);

    return this.plansRepo.findOne({
      where: { id: savedPlan.id },
      relations: ['installment_dues'],
    });
  }

  // ─── RECORD PAYMENT ───────────────────────────────────────────────────────

  async recordPayment(
    customerId: number,
    body: {
      amount: number;
      discount_amount?: number;
      payment_date: string;
      payment_method: string;
      installment_due_id?: number;
      installment_plan_id?: number;
      cheque_number?: string;
      bank_name?: string;
      notes?: string;
    },
  ) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const amountCollected = Number(body.amount || 0);
    const discountAmount = Number(body.discount_amount || 0);
    const settlementAmount = amountCollected + discountAmount;
    let remaining = settlementAmount;

    // Save payment record
    const payment = new InstallmentPayment();
    payment.customer_id = customerId;
    payment.amount = amountCollected;
    payment.discount_amount = discountAmount;
    payment.payment_date = body.payment_date;
    payment.payment_method = body.payment_method ?? 'cash';
    payment.installment_due_id = body.installment_due_id ?? null!;
    payment.installment_plan_id = body.installment_plan_id ?? null!;
    payment.cheque_number = body.cheque_number ?? null!;
    payment.bank_name = body.bank_name ?? null!;
    payment.notes = body.notes ?? (discountAmount > 0 ? `Discount: Rs ${discountAmount}` : null!);
    payment.status = 'confirmed';
    await this.paymentsRepo.save(payment);

    // Apply to specific due if given
    if (body.installment_due_id) {
      const due = await this.duesRepo.findOne({ where: { id: body.installment_due_id } });
      if (due) {
        const dueOwed = due.due_amount - due.paid_amount;
        const applied = Math.min(remaining, dueOwed);
        due.paid_amount += applied;
        due.paid_date = body.payment_date;
        due.status =
          due.paid_amount >= due.due_amount
            ? 'paid'
            : due.paid_amount > 0
            ? 'partial'
            : due.status;
        await this.duesRepo.save(due);
        remaining -= applied;

        // Apply excess to next installment
        if (remaining > 0) {
          const nextDue = await this.duesRepo.findOne({
            where: {
              installment_plan_id: due.installment_plan_id,
            },
            order: { installment_number: 'ASC' },
          });
          // Find next pending due after current
          const allDues = await this.duesRepo.find({
            where: { installment_plan_id: due.installment_plan_id },
            order: { installment_number: 'ASC' },
          });
          const nextPending = allDues.find(
            (d) =>
              d.installment_number > due.installment_number &&
              d.status !== 'paid',
          );
          if (nextPending && nextDue) {
            const nextApplied = Math.min(
              remaining,
              nextPending.due_amount - nextPending.paid_amount,
            );
            nextPending.paid_amount += nextApplied;
            if (nextPending.paid_amount >= nextPending.due_amount) {
              nextPending.status = 'paid';
              nextPending.paid_date = body.payment_date;
            } else if (nextPending.paid_amount > 0) {
              nextPending.status = 'partial';
            }
            await this.duesRepo.save(nextPending);
          }
        }
      }

      // Update plan totals
      if (body.installment_plan_id) {
        await this.recalculatePlan(body.installment_plan_id);
      }
    } else if (body.installment_plan_id) {
      // General payment toward a plan — apply to oldest pending due
      await this.applyPaymentToPlan(body.installment_plan_id, remaining, body.payment_date);
      await this.recalculatePlan(body.installment_plan_id);
    } else {
      // General payment (no plan, no due) — apply to pending sales oldest-first,
      // then to pending manual credits oldest-first
      let saleRemaining = settlementAmount;
      const pendingSales = await this.salesRepo.find({
        where: { customer_id: customerId },
        order: { date: 'ASC' },
      });
      for (const sale of pendingSales) {
        if (saleRemaining <= 0) break;
        if (sale.pending_amount <= 0) continue;
        const apply = Math.min(saleRemaining, sale.pending_amount);
        sale.paid_amount += apply;
        sale.pending_amount = Math.max(0, sale.total_amount - sale.paid_amount);
        sale.status =
          sale.pending_amount === 0
            ? SaleStatus.PAID
            : sale.paid_amount > 0
            ? SaleStatus.PARTIAL
            : SaleStatus.PENDING;
        await this.salesRepo.save(sale);
        saleRemaining -= apply;
      }
      // Apply leftover to pending manual credits oldest-first
      if (saleRemaining > 0) {
        const manualCredits = await this.manualCreditsRepo.find({
          where: { customer_id: customerId },
          order: { credit_date: 'ASC' },
        });
        for (const mc of manualCredits) {
          if (saleRemaining <= 0) break;
          const pendingMc = mc.amount - mc.paid_amount;
          if (pendingMc <= 0) continue;
          const apply = Math.min(saleRemaining, pendingMc);
          mc.paid_amount += apply;
          await this.manualCreditsRepo.save(mc);
          saleRemaining -= apply;
        }
      }
    }

    // Update ledger totals
    const ledger = await this.getOrCreateLedger(customerId);
    ledger.total_paid += settlementAmount;
    ledger.remaining_balance = Math.max(0, ledger.total_purchased - ledger.total_paid);
    await this.ledgerRepo.save(ledger);

    return { success: true, payment_id: payment.id };
  }

  private async applyPaymentToPlan(
    planId: number,
    amount: number,
    paymentDate: string,
  ): Promise<void> {
    let remaining = amount;
    const dues = await this.duesRepo.find({
      where: { installment_plan_id: planId },
      order: { installment_number: 'ASC' },
    });
    for (const due of dues) {
      if (remaining <= 0) break;
      if (due.status === 'paid') continue;
      const owed = due.due_amount - due.paid_amount;
      const applied = Math.min(remaining, owed);
      due.paid_amount += applied;
      due.paid_date = paymentDate;
      due.status = due.paid_amount >= due.due_amount ? 'paid' : 'partial';
      await this.duesRepo.save(due);
      remaining -= applied;
    }
  }

  private async recalculatePlan(planId: number): Promise<void> {
    const plan = await this.plansRepo.findOne({
      where: { id: planId },
      relations: ['installment_dues'],
    });
    if (!plan) return;
    const totalPaid =
      (plan.down_payment ?? 0) +
      plan.installment_dues.reduce((s, d) => s + d.paid_amount, 0);
    plan.paid_amount = totalPaid;
    plan.remaining_amount = Math.max(0, plan.total_amount - totalPaid);
    const allPaid = plan.installment_dues.every((d) => d.status === 'paid');
    const anyOverdue = plan.installment_dues.some((d) => d.status === 'overdue');
    if (plan.remaining_amount <= 0 || allPaid) plan.status = 'completed';
    else if (anyOverdue) plan.status = 'overdue';
    else plan.status = 'active';
    await this.plansRepo.save(plan);
  }

  // ─── SET CUSTOMER TYPE ────────────────────────────────────────────────────

  async setCustomerType(
    customerId: number,
    body: { customer_type: string; credit_limit: number; payment_term_days: number },
  ) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    const ledger = await this.getOrCreateLedger(customerId);
    ledger.customer_type = body.customer_type;
    ledger.credit_limit = body.credit_limit ?? 0;
    ledger.payment_term_days = body.payment_term_days ?? 30;
    return this.ledgerRepo.save(ledger);
  }

  // ─── OVERDUE SUMMARY (for dashboard widget) ───────────────────────────────

  async getOverdueSummary() {
    const overdueRows = await this.dataSource.query(
      `SELECT COUNT(DISTINCT p.customer_id) as overdue_customers,
              COALESCE(SUM(d.due_amount - d.paid_amount), 0) as total_overdue
       FROM installment_due d
       JOIN installment_plan p ON p.id = d.installment_plan_id
       WHERE d.status = 'overdue'`,
    );

    const todayCollected = await this.dataSource.query(
      `SELECT COALESCE(SUM(ip.amount), 0) as total
       FROM installment_payments ip
       WHERE DATE(ip.payment_date) = DATE('now')`,
    );

    return {
      overdue_customers: Number(overdueRows[0]?.overdue_customers ?? 0),
      total_overdue: Number(overdueRows[0]?.total_overdue ?? 0),
      today_collections: Number(todayCollected[0]?.total ?? 0),
    };
  }

  // ─── SALES-BASED LEDGER SUMMARY (like mill-payments/ledger) ────────────────

  async getSalesLedgerSummary() {
    const customers = await this.customersRepo.find({ order: { name: 'ASC' } });

    const results = await Promise.all(
      customers.map(async (customer) => {
        const sales = await this.salesRepo.find({ where: { customer_id: customer.id } });
        if (sales.length === 0) return null;

        const totalBilled = sales.reduce((s, r) => s + Number(r.total_amount), 0);
        const totalCollected = sales.reduce((s, r) => s + Number(r.paid_amount), 0);
        const balance = sales.reduce((s, r) => s + Number(r.pending_amount), 0);

        return {
          customer: { id: customer.id, name: customer.name, phone: customer.phone },
          totalBilled,
          totalCollected,
          balance,
        };
      }),
    );

    return results.filter(Boolean);
  }

  // ─── SALES-BASED INDIVIDUAL LEDGER (like mill-payments/ledger/:id) ─────────

  async getCustomerSalesLedger(customerId: number) {
    const customer = await this.customersRepo.findOne({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Fetch all sales with item summaries
    const salesRows: Array<{
      id: number; date: string; total_amount: number; paid_amount: number;
      pending_amount: number; status: string; items_summary: string;
    }> = await this.dataSource.query(
      `SELECT s.id, s.date, s.total_amount, s.paid_amount, s.pending_amount, s.status,
              group_concat(
                p.name ||
                CASE WHEN cb.brand_name IS NOT NULL THEN ' (' || cb.brand_name || ')' ELSE '' END ||
                ' x' || CAST(CAST(si.quantity AS INTEGER) AS TEXT) || ' ' || p.unit,
                ', '
              ) as items_summary
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       LEFT JOIN products p ON p.id = si.product_id
       LEFT JOIN cement_brands cb ON cb.id = si.cement_brand_id
       WHERE s.customer_id = ?
       GROUP BY s.id
       ORDER BY s.date ASC`,
      [customerId],
    );

    // Fetch all direct sale payments
    const payments = await this.salePaymentsRepo.find({
      where: { customer_id: customerId },
      order: { payment_date: 'ASC' },
    });

    type RawEntry = {
      id: string; date: Date; type: 'sale' | 'payment';
      description: string; debit: number; credit: number;
      sale_id?: number; payment_status?: string;
    };

    const raw: RawEntry[] = [
      ...salesRows.map((s) => ({
        id: `sale-${s.id}`,
        date: new Date(s.date),
        type: 'sale' as const,
        description: s.items_summary || `Sale #${s.id}`,
        debit: Number(s.total_amount),
        credit: 0,
        sale_id: s.id,
        payment_status: s.status,
      })),
      ...payments.map((p) => ({
        id: `pay-${p.id}`,
        date: new Date(p.payment_date),
        type: 'payment' as const,
        description: p.notes || (Number(p.discount_amount || 0) > 0 ? 'Payment received + discount' : 'Payment received'),
        debit: 0,
        credit: Number(p.amount_paid) + Number(p.discount_amount || 0),
      })),
    ];

    // Sort by date; sales before payments on same day
    raw.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      if (diff !== 0) return diff;
      return a.type === 'sale' ? -1 : 1;
    });

    // Compute running balance
    let running = 0;
    const entries = raw.map((e) => {
      running += e.debit - e.credit;
      return { ...e, balance: running };
    });

    const totalDebit = salesRows.reduce((s, r) => s + Number(r.total_amount), 0);
    const totalCredit = payments.reduce((s, r) => s + Number(r.amount_paid) + Number(r.discount_amount || 0), 0);

    // Sales summary table (sorted by date desc)
    const salesSummary = [...salesRows].sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      customer,
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
      entries,
      salesSummary,
    };
  }
}

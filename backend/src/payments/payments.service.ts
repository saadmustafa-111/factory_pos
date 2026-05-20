import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
  ) {}

  async create(payload: CreatePaymentDto) {
    const sale = await this.salesRepo.findOne({ where: { id: payload.sale_id } });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    const amountPaid = Number(payload.amount_paid || 0);
    const discountAmount = Number(payload.discount_amount || 0);
    const settlementAmount = amountPaid + discountAmount;

    const payment = this.paymentsRepo.create({
      sale_id: payload.sale_id,
      customer_id: payload.customer_id ?? sale.customer_id,
      amount_paid: amountPaid,
      discount_amount: discountAmount,
      payment_date: payload.payment_date ? new Date(payload.payment_date) : new Date(),
      notes: payload.notes ?? (discountAmount > 0 ? `Discount: Rs ${discountAmount}` : undefined),
    });
    await this.paymentsRepo.save(payment);

    sale.paid_amount += settlementAmount;
    sale.pending_amount = Math.max(0, sale.total_amount - sale.paid_amount);
    sale.status =
      sale.pending_amount === 0
        ? SaleStatus.PAID
        : sale.paid_amount > 0
          ? SaleStatus.PARTIAL
          : SaleStatus.PENDING;
    sale.is_overdue =
      sale.status !== SaleStatus.PAID && !!sale.due_date && sale.due_date < new Date();
    await this.salesRepo.save(sale);

    return this.salesRepo.findOne({ where: { id: sale.id } });
  }

  async ledger() {
    const rows = await this.salesRepo.find();
    const byCustomer = new Map<
      string,
      {
        customer_id: number | null;
        customer_name: string;
        totalOwed: number;
        totalPaid: number;
        balance: number;
      }
    >();

    rows.forEach((sale) => {
      const key = String(sale.customer_id ?? sale.customer_name ?? 'walk-in');
      const row = byCustomer.get(key) ?? {
        customer_id: sale.customer_id ?? null,
        customer_name: sale.customer?.name || sale.customer_name || 'Walk-in',
        totalOwed: 0,
        totalPaid: 0,
        balance: 0,
      };
      row.totalOwed += sale.total_amount;
      row.totalPaid += sale.paid_amount;
      row.balance += sale.pending_amount;
      byCustomer.set(key, row);
    });

    const paymentHistory = await this.paymentsRepo.find({
      relations: ['sale', 'customer'],
      order: { payment_date: 'DESC' },
    });

    return {
      summary: Array.from(byCustomer.values()),
      payments: paymentHistory,
    };
  }
}

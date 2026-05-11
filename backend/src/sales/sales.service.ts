import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Payment } from '../payments/entities/payment.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleItem } from './entities/sale-item.entity';
import { Sale, SaleStatus } from './entities/sale.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepo: Repository<SaleItem>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(Inventory)
    private readonly inventoryRepo: Repository<Inventory>,
  ) {}

  private async avgPurchasePrice(productId: number, cementBrandId?: number) {
    const qb = this.inventoryRepo
      .createQueryBuilder('inventory')
      .select(
        'COALESCE(SUM(inventory.total_cost) / NULLIF(SUM(inventory.quantity_received), 0), 0)',
        'avg',
      )
      .where('inventory.product_id = :productId', { productId });

    if (cementBrandId) {
      qb.andWhere('inventory.cement_brand_id = :cementBrandId', { cementBrandId });
    }

    const row = await qb.getRawOne<{ avg: string }>();
    return Number(row?.avg ?? 0);
  }

  async create(payload: CreateSaleDto) {
    let customer = payload.customer_id
      ? await this.customersRepo.findOne({ where: { id: payload.customer_id } })
      : null;

    // Auto-create a new Customer record when name is provided
    if (!customer && payload.customer_name) {
      customer = await this.customersRepo.save(
        this.customersRepo.create({
          name: payload.customer_name,
          phone: payload.customer_phone,
          address: payload.customer_address,
        }),
      );
    }

    const items = await Promise.all(
      payload.items.map(async (item) => ({
        ...item,
        purchase_price_per_unit: await this.avgPurchasePrice(
          item.product_id,
          item.cement_brand_id,
        ),
        total_price: item.quantity * item.sale_price_per_unit,
      })),
    );

    const loadingCharges = Number(payload.loading_charges || 0);
    const discount = Number(payload.discount || 0);
    const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0) + loadingCharges - discount;
    const paidAmount = Math.max(0, payload.paid_amount || 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);

    const status =
      pendingAmount === 0
        ? SaleStatus.PAID
        : paidAmount > 0
          ? SaleStatus.PARTIAL
          : SaleStatus.PENDING;

    const dueDate = payload.due_date
      ? new Date(payload.due_date)
      : payload.credit_days
        ? new Date(new Date(payload.date).getTime() + payload.credit_days * 86400000)
        : undefined;

    const sale = this.salesRepo.create({
      customer_id: customer?.id,
      customer_name: customer?.name ?? payload.customer_name,
      customer_phone: customer?.phone ?? payload.customer_phone,
      date: new Date(payload.date),
      due_date: dueDate,
      credit_days: payload.credit_days,
      total_amount: totalAmount,
      loading_charges: loadingCharges,
      discount: discount,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      status,
      is_overdue: false,
      notes: payload.notes,
      items: items.map((item) => this.saleItemsRepo.create(item)),
    });

    const savedSale = await this.salesRepo.save(sale);

    // Note: Initial sale payment does not create a payment record.
    // Use "Record Payment" to track payment collections.

    return this.findOne(savedSale.id);
  }

  async findAll(status?: string) {
    if (status === 'overdue') {
      return this.salesRepo.find({
        where: { is_overdue: true },
        order: { date: 'DESC', id: 'DESC' },
      });
    }

    if (!status || status === 'all') {
      return this.salesRepo.find({ order: { date: 'DESC', id: 'DESC' } });
    }

    return this.salesRepo.find({
      where: { status: status as SaleStatus },
      order: { date: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const sale = await this.salesRepo.findOne({
      where: { id },
      relations: ['payments', 'items', 'items.product', 'items.cement_brand', 'customer'],
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    return sale;
  }
}

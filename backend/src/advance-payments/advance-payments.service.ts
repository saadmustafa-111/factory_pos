import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AdvancePayment,
  AdvancePaymentStatus,
} from './entities/advance-payment.entity';
import { AdvancePaymentItem } from './entities/advance-payment-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { CreateAdvancePaymentDto } from './dto/create-advance-payment.dto';
import { ProcessPickupDto } from './dto/process-pickup.dto';
import { Inventory } from '../inventory/entities/inventory.entity';

@Injectable()
export class AdvancePaymentsService {
  constructor(
    @InjectRepository(AdvancePayment)
    private readonly advancePaymentsRepo: Repository<AdvancePayment>,
    @InjectRepository(AdvancePaymentItem)
    private readonly advancePaymentItemsRepo: Repository<AdvancePaymentItem>,
    @InjectRepository(Customer)
    private readonly customersRepo: Repository<Customer>,
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(SaleItem)
    private readonly saleItemsRepo: Repository<SaleItem>,
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
      qb.andWhere('inventory.cement_brand_id = :cementBrandId', {
        cementBrandId,
      });
    }

    const row = await qb.getRawOne<{ avg: string }>();
    return Number(row?.avg ?? 0);
  }

  async create(payload: CreateAdvancePaymentDto) {
    let customer = payload.customer_id
      ? await this.customersRepo.findOne({ where: { id: payload.customer_id } })
      : null;

    // Auto-create customer if name provided
    if (!customer && payload.customer_name) {
      customer = await this.customersRepo.save(
        this.customersRepo.create({
          name: payload.customer_name,
          phone: payload.customer_phone,
          address: payload.customer_address,
        }),
      );
    }

    const items = payload.items.map((item) => ({
      ...item,
      total_amount: item.quantity * item.rate_per_unit,
      quantity_picked: 0,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.total_amount, 0);

    const advancePayment = this.advancePaymentsRepo.create({
      customer_id: customer?.id,
      customer_name: customer?.name ?? payload.customer_name,
      customer_phone: customer?.phone ?? payload.customer_phone,
      customer_address: customer?.address ?? payload.customer_address,
      payment_date: payload.payment_date,
      paid_amount: payload.paid_amount,
      total_amount: totalAmount,
      payment_method: payload.payment_method ?? 'cash',
      expected_pickup_date: payload.expected_pickup_date,
      status: AdvancePaymentStatus.PENDING,
      notes: payload.notes,
      items: items.map((item) => this.advancePaymentItemsRepo.create(item)),
    });

    return this.advancePaymentsRepo.save(advancePayment);
  }

  async findAll(status?: string) {
    if (!status || status === 'all') {
      return this.advancePaymentsRepo.find({
        order: { payment_date: 'DESC', id: 'DESC' },
      });
    }

    return this.advancePaymentsRepo.find({
      where: { status: status as AdvancePaymentStatus },
      order: { payment_date: 'DESC', id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const payment = await this.advancePaymentsRepo.findOne({
      where: { id },
    });
    if (!payment) {
      throw new NotFoundException('Advance payment not found');
    }
    return payment;
  }

  async processPickup(id: number, payload: ProcessPickupDto) {
    const advancePayment = await this.findOne(id);

    if (advancePayment.status === AdvancePaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'This advance payment has already been completed',
      );
    }

    if (advancePayment.status === AdvancePaymentStatus.CANCELLED) {
      throw new BadRequestException('This advance payment has been cancelled');
    }

    // Prepare sale items with purchase prices
    const saleItems = await Promise.all(
      payload.items.map(async (pickupItem) => {
        const advItem = advancePayment.items.find(
          (i) => i.id === pickupItem.advance_payment_item_id,
        );
        if (!advItem) {
          throw new BadRequestException(
            `Invalid item ID: ${pickupItem.advance_payment_item_id}`,
          );
        }

        const remainingQty = advItem.quantity - advItem.quantity_picked;
        if (pickupItem.quantity > remainingQty) {
          throw new BadRequestException(
            `Cannot pick up ${pickupItem.quantity} ${advItem.unit}. Only ${remainingQty} ${advItem.unit} remaining.`,
          );
        }

        // Update picked quantity
        advItem.quantity_picked += pickupItem.quantity;
        await this.advancePaymentItemsRepo.save(advItem);

        return {
          product_id: advItem.product_id,
          cement_brand_id: advItem.cement_brand_id,
          quantity: pickupItem.quantity,
          sale_price_per_unit: advItem.rate_per_unit,
          purchase_price_per_unit: await this.avgPurchasePrice(
            advItem.product_id,
            advItem.cement_brand_id,
          ),
          total_price: pickupItem.quantity * advItem.rate_per_unit,
        };
      }),
    );

    const saleTotal = saleItems.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );
    const paidAmount =
      advancePayment.paid_amount + (payload.additional_payment ?? 0);
    const pendingAmount = Math.max(0, saleTotal - paidAmount);

    const saleStatus =
      pendingAmount === 0
        ? SaleStatus.PAID
        : paidAmount > 0
          ? SaleStatus.PARTIAL
          : SaleStatus.PENDING;

    // Create the actual sale
    const sale = this.salesRepo.create({
      customer_id: advancePayment.customer_id,
      customer_name: advancePayment.customer_name,
      customer_phone: advancePayment.customer_phone,
      date: new Date(payload.pickup_date),
      total_amount: saleTotal,
      paid_amount: paidAmount,
      pending_amount: pendingAmount,
      status: saleStatus,
      is_overdue: false,
      notes: `Pickup from Advance Payment #${advancePayment.id}. ${payload.notes ?? ''}`,
      items: saleItems.map((item) => this.saleItemsRepo.create(item)),
    });

    const savedSale = await this.salesRepo.save(sale);

    // Check if all items fully picked
    const allItemsComplete = advancePayment.items.every(
      (item) => item.quantity_picked >= item.quantity,
    );

    if (allItemsComplete) {
      advancePayment.status = AdvancePaymentStatus.COMPLETED;
      advancePayment.converted_sale_id = savedSale.id;
    } else {
      advancePayment.status = AdvancePaymentStatus.PARTIAL;
    }

    await this.advancePaymentsRepo.save(advancePayment);

    return { advancePayment, sale: savedSale };
  }

  async cancel(id: number) {
    const payment = await this.findOne(id);

    if (payment.status === AdvancePaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Cannot cancel a completed advance payment',
      );
    }

    if (payment.status === AdvancePaymentStatus.PARTIAL) {
      throw new BadRequestException(
        'Cannot cancel a partially picked up advance payment',
      );
    }

    payment.status = AdvancePaymentStatus.CANCELLED;
    return this.advancePaymentsRepo.save(payment);
  }
}

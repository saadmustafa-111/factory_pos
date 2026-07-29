import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense, ExpenseCategory } from './entities/expense.entity';

export interface CreateExpenseDto {
  category: ExpenseCategory;
  amount: number;
  description?: string;
  date?: string; // YYYY-MM-DD, defaults to today
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly repo: Repository<Expense>,
  ) {}

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const date = dto.date ? new Date(dto.date) : new Date();
    const expense = this.repo.create({
      category: dto.category,
      amount: Number(dto.amount),
      description: dto.description ?? undefined,
      date,
    } as Partial<Expense>);
    return this.repo.save(expense);
  }

  async findAll(from?: string, to?: string): Promise<Expense[]> {
    const qb = this.repo
      .createQueryBuilder('e')
      .orderBy('e.date', 'DESC')
      .addOrderBy('e.createdAt', 'DESC');

    if (from) qb.andWhere('DATE(e.date) >= :from', { from });
    if (to) qb.andWhere('DATE(e.date) <= :to', { to });

    return qb.getMany();
  }

  async findToday(): Promise<Expense[]> {
    const today = new Date().toISOString().slice(0, 10);
    return this.findAll(today, today);
  }

  async todayTotals(): Promise<{
    total: number;
    byCategory: Record<string, number>;
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.findAll(today, today);
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + r.amount;
      total += r.amount;
    }
    return { total, byCategory };
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }

  async update(id: number, dto: Partial<CreateExpenseDto>): Promise<Expense> {
    const expense = await this.repo.findOneOrFail({ where: { id } });
    if (dto.category !== undefined) expense.category = dto.category;
    if (dto.amount !== undefined) expense.amount = Number(dto.amount);
    if (dto.description !== undefined) expense.description = dto.description;
    if (dto.date !== undefined) expense.date = new Date(dto.date);
    return this.repo.save(expense);
  }
}

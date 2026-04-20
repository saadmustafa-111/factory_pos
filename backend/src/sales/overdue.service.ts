import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Sale, SaleStatus } from './entities/sale.entity';

@Injectable()
export class OverdueService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
  ) {}

  async onApplicationBootstrap() {
    await this.refreshOverdueFlags();
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async refreshOverdueFlags() {
    const now = new Date();
    const rows = await this.salesRepo.find({
      where: {
        status: Not(SaleStatus.PAID),
      },
    });

    await Promise.all(
      rows.map(async (sale) => {
        const next = !!sale.due_date && sale.due_date < now;
        if (sale.is_overdue !== next) {
          sale.is_overdue = next;
          await this.salesRepo.save(sale);
        }
      }),
    );
  }
}

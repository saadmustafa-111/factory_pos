import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Expense } from '../expenses/entities/expense.entity';
import { Product } from '../products/entities/product.entity';
import {
  ManagedOption,
  ManagedOptionScope,
} from './entities/managed-option.entity';

@Injectable()
export class OptionsService {
  constructor(
    @InjectRepository(ManagedOption)
    private readonly optionsRepo: Repository<ManagedOption>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Expense)
    private readonly expensesRepo: Repository<Expense>,
    private readonly dataSource: DataSource,
  ) {}

  normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  sanitizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ');
  }

  private columnForScope(scope: ManagedOptionScope) {
    if (scope === ManagedOptionScope.PRODUCT_CATEGORY) return 'category';
    if (scope === ManagedOptionScope.PRODUCT_TYPE) return 'type';
    if (scope === ManagedOptionScope.PRODUCT_UNIT) return 'unit';
    return 'category';
  }

  private async usageCount(scope: ManagedOptionScope, name: string) {
    if (scope === ManagedOptionScope.EXPENSE_CATEGORY) {
      return this.expensesRepo.count({ where: { category: name as any } });
    }

    const column = this.columnForScope(scope);
    return this.productsRepo.count({
      where: { [column]: name } as Partial<Product>,
    });
  }

  async findAll(scope: ManagedOptionScope) {
    return this.optionsRepo.find({
      where: { scope, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async create(scope: ManagedOptionScope, name: string) {
    const sanitized = this.sanitizeName(name);
    if (!sanitized) {
      throw new BadRequestException('Name cannot be blank');
    }

    const normalized = this.normalizeName(sanitized);
    const existing = await this.optionsRepo.findOne({
      where: { scope, normalized_name: normalized },
    });

    if (existing?.is_active) {
      throw new BadRequestException('An option with this name already exists');
    }

    if (existing) {
      existing.name = sanitized;
      existing.is_active = true;
      return this.optionsRepo.save(existing);
    }

    return this.optionsRepo.save(
      this.optionsRepo.create({
        scope,
        name: sanitized,
        normalized_name: normalized,
        is_active: true,
      }),
    );
  }

  async update(scope: ManagedOptionScope, id: number, name: string) {
    const sanitized = this.sanitizeName(name);
    if (!sanitized) {
      throw new BadRequestException('Name cannot be blank');
    }

    const option = await this.optionsRepo.findOne({ where: { id, scope } });
    if (!option) {
      throw new NotFoundException('Option not found');
    }

    const normalized = this.normalizeName(sanitized);
    const duplicate = await this.optionsRepo.findOne({
      where: { scope, normalized_name: normalized },
    });

    if (duplicate && duplicate.id !== option.id) {
      throw new BadRequestException('An option with this name already exists');
    }

    if (option.name === sanitized) {
      return option;
    }

    return this.dataSource.transaction(async (manager) => {
      option.name = sanitized;
      option.normalized_name = normalized;
      await manager.getRepository(ManagedOption).save(option);

      if (scope === ManagedOptionScope.EXPENSE_CATEGORY) {
        await manager
          .getRepository(Expense)
          .createQueryBuilder()
          .update()
          .set({ category: sanitized as any })
          .where('LOWER(TRIM(category)) = :value', {
            value: this.normalizeName(option.name),
          })
          .execute();
      } else {
        const column = this.columnForScope(scope);
        await manager
          .getRepository(Product)
          .createQueryBuilder()
          .update()
          .set({ [column]: sanitized } as Partial<Product>)
          .where(`LOWER(TRIM(${column})) = :value`, {
            value: this.normalizeName(option.name),
          })
          .execute();
      }

      return option;
    });
  }

  async remove(scope: ManagedOptionScope, id: number) {
    const option = await this.optionsRepo.findOne({ where: { id, scope } });
    if (!option) {
      throw new NotFoundException('Option not found');
    }

    const inUse = await this.usageCount(scope, option.name);
    if (inUse > 0) {
      throw new BadRequestException(
        `${inUse} record${inUse === 1 ? '' : 's'} currently use this option`,
      );
    }

    option.is_active = false;
    await this.optionsRepo.save(option);
    return { message: 'Option deleted successfully' };
  }

  async ensureDefaults(
    scope: ManagedOptionScope,
    names: string[],
  ): Promise<void> {
    for (const name of names) {
      const sanitized = this.sanitizeName(name);
      if (!sanitized) continue;
      const normalized = this.normalizeName(sanitized);
      const existing = await this.optionsRepo.findOne({
        where: { scope, normalized_name: normalized },
      });
      if (!existing) {
        await this.optionsRepo.save(
          this.optionsRepo.create({
            scope,
            name: sanitized,
            normalized_name: normalized,
            is_active: true,
          }),
        );
      } else if (!existing.is_active) {
        existing.is_active = true;
        existing.name = sanitized;
        await this.optionsRepo.save(existing);
      }
    }
  }
}

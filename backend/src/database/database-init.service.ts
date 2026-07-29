import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseInitService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      // Enable WAL mode for crash protection and better concurrency
      await this.dataSource.query(`PRAGMA journal_mode = WAL`);
      // NORMAL is safe with WAL — only syncs at WAL checkpoints
      await this.dataSource.query(`PRAGMA synchronous = NORMAL`);
      // Enforce foreign key constraints
      await this.dataSource.query(`PRAGMA foreign_keys = ON`);
      // 64 MB cache (negative = kibibytes)
      await this.dataSource.query(`PRAGMA cache_size = -64000`);
      this.logger.log('SQLite WAL mode and pragmas configured successfully');
    } catch (err) {
      this.logger.error('Failed to configure SQLite pragmas', err);
    }

    // ── One-time migration: populate manual_credit.paid_amount from ledger.total_paid ──
    try {
      // Only run if any manual credit still has paid_amount = 0 but the ledger shows payments
      const needsMigration = await this.dataSource.query(
        `SELECT cl.customer_id, cl.total_paid
         FROM customer_ledger cl
         WHERE cl.total_paid > 0
           AND EXISTS (
             SELECT 1 FROM customer_manual_credits mc
             WHERE mc.customer_id = cl.customer_id AND mc.paid_amount = 0
           )`,
      );
      for (const row of needsMigration) {
        const customerId: number = row.customer_id;
        let pool: number = Number(row.total_paid);
        // Distribute oldest-first
        const credits = await this.dataSource.query(
          `SELECT id, amount FROM customer_manual_credits
           WHERE customer_id = ? ORDER BY credit_date ASC`,
          [customerId],
        );
        for (const mc of credits) {
          if (pool <= 0) break;
          const apply = Math.min(pool, Number(mc.amount));
          await this.dataSource.query(
            `UPDATE customer_manual_credits SET paid_amount = ? WHERE id = ?`,
            [apply, mc.id],
          );
          pool -= apply;
        }
      }
      if (needsMigration.length > 0) {
        this.logger.log(
          `Migrated manual credit paid_amount for ${needsMigration.length} customer(s)`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to migrate manual credit paid_amount', err);
    }
  }
}

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
  }
}

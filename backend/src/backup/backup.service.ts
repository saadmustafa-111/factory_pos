import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleDriveService } from './google-drive.service';

export interface BackupStatus {
  lastBackupDate: string | null;
  lastBackupSize: number | null;
  totalBackups: number;
  lastCloudBackup: string | null;
  isGoogleConnected: boolean;
}

export interface BackupMeta {
  lastLocalBackup: string | null;
  lastLocalBackupSize: number | null;
  lastCloudBackup: string | null;
}

// Keep 365 local auto-backups (about 1 full year of daily history)
const MAX_AUTO_BACKUPS = 365;

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private dbPath: string;
  private backupDir: string;
  private metaPath: string;

  constructor(
    private readonly dataSource: DataSource,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  onModuleInit() {
    // Resolve DB path from TypeORM DataSource options
    const dbOption = (this.dataSource.options as any).database as string;
    // dbOption may be absolute or relative
    this.dbPath = path.isAbsolute(dbOption)
      ? dbOption
      : path.join(process.cwd(), dbOption);

    // Derive userData from DATABASE_DIR env var (set by Electron)
    // DATABASE_DIR = <userData>/database  →  userData = parent of that
    const dbDir = process.env.DATABASE_DIR;
    const userData = dbDir ? path.dirname(dbDir) : process.cwd();

    this.backupDir = path.join(userData, 'backups');
    this.metaPath = path.join(userData, 'backup-meta.json');

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    this.logger.log(`Backup service initialised. DB: ${this.dbPath}`);
    this.logger.log(`Backup directory: ${this.backupDir}`);
  }

  // ─── NIGHTLY AUTO-BACKUP ───────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runNightlyBackup(): Promise<void> {
    this.logger.log('Running nightly automatic backup…');
    try {
      const filePath = await this.createBackup('auto');
      this.logger.log(`Nightly backup created: ${filePath}`);
    } catch (err) {
      this.logger.error('Nightly backup failed', err);
    }
  }

  // ─── CORE BACKUP LOGIC ────────────────────────────────────────────────────

  async createBackup(
    type: 'auto' | 'manual' | 'cloud' = 'manual',
  ): Promise<string> {
    // 1. Flush WAL to main DB file before copying
    try {
      await this.dataSource.query(`PRAGMA wal_checkpoint(TRUNCATE)`);
    } catch (err) {
      this.logger.warn('WAL checkpoint failed (continuing anyway)', err);
    }

    // 2. Build filename
    const ts = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `pos-backup-${type}-${ts}.db`;
    const backupPath = path.join(this.backupDir, filename);

    // 3. Copy the DB file
    fs.copyFileSync(this.dbPath, backupPath);

    const stat = fs.statSync(backupPath);
    this.logger.log(`Backup created: ${backupPath} (${stat.size} bytes)`);

    // 4. Enforce max 30 auto backups
    if (type === 'auto') {
      this.pruneOldAutoBackups();
    }

    // 5. Update meta
    this.updateMeta({
      lastLocalBackup: new Date().toISOString(),
      lastLocalBackupSize: stat.size,
    });

    // 6. Upload to Google Drive if online
    await this.googleDriveService.uploadIfOnline(backupPath);

    return backupPath;
  }

  private pruneOldAutoBackups(): void {
    try {
      const autoFiles = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.startsWith('pos-backup-auto-') && f.endsWith('.db'))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(this.backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => a.time - b.time); // oldest first

      while (autoFiles.length > MAX_AUTO_BACKUPS) {
        const oldest = autoFiles.shift()!;
        fs.unlinkSync(path.join(this.backupDir, oldest.name));
        this.logger.log(`Pruned old backup: ${oldest.name}`);
      }
    } catch (err) {
      this.logger.warn('Failed to prune old backups', err);
    }
  }

  // ─── STATUS ────────────────────────────────────────────────────────────────

  async getStatus(): Promise<BackupStatus> {
    const meta = this.readMeta();
    const isGoogleConnected = await this.googleDriveService.isConnected();

    let totalBackups = 0;
    try {
      totalBackups = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.endsWith('.db')).length;
    } catch {
      /* dir may not exist yet */
    }

    return {
      lastBackupDate: meta.lastLocalBackup,
      lastBackupSize: meta.lastLocalBackupSize,
      totalBackups,
      lastCloudBackup: meta.lastCloudBackup,
      isGoogleConnected,
    };
  }

  // ─── META JSON HELPERS ─────────────────────────────────────────────────────

  readMeta(): BackupMeta {
    try {
      if (fs.existsSync(this.metaPath)) {
        return JSON.parse(
          fs.readFileSync(this.metaPath, 'utf-8'),
        ) as BackupMeta;
      }
    } catch {
      /* ignore parse errors */
    }
    return {
      lastLocalBackup: null,
      lastLocalBackupSize: null,
      lastCloudBackup: null,
    };
  }

  updateMeta(partial: Partial<BackupMeta>): void {
    const current = this.readMeta();
    const updated: BackupMeta = { ...current, ...partial };
    try {
      fs.writeFileSync(
        this.metaPath,
        JSON.stringify(updated, null, 2),
        'utf-8',
      );
    } catch (err) {
      this.logger.warn('Could not write backup-meta.json', err);
    }
  }

  // Allows GoogleDriveService to update lastCloudBackup in meta
  updateCloudBackupTime(): void {
    this.updateMeta({ lastCloudBackup: new Date().toISOString() });
  }

  // ─── RESTORE HELPERS ──────────────────────────────────────────────────────

  /**
   * Validates that a file starts with the SQLite magic bytes:
   * "SQLite format 3\x00"
   */
  validateSQLiteFile(filePath: string): boolean {
    try {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(16);
      fs.readSync(fd, buffer, 0, 16, 0);
      fs.closeSync(fd);
      return buffer.toString('utf8', 0, 15) === 'SQLite format 3';
    } catch {
      return false;
    }
  }

  /**
   * Replaces the live database with the given backup file.
   * WARNING: This will cause the app to use stale ORM connections —
   * the user should restart the app after restore.
   */
  async restoreFromFile(backupFilePath: string): Promise<void> {
    if (!fs.existsSync(backupFilePath)) {
      throw new Error(`Backup file not found: ${backupFilePath}`);
    }

    if (!this.validateSQLiteFile(backupFilePath)) {
      throw new Error('Selected file is not a valid SQLite database.');
    }

    // Auto-backup current DB before overwriting
    try {
      await this.createBackup('auto');
    } catch (err) {
      this.logger.warn('Pre-restore auto-backup failed (continuing)', err);
    }

    // Flush WAL on current DB
    try {
      await this.dataSource.query(`PRAGMA wal_checkpoint(TRUNCATE)`);
    } catch {
      /* best effort */
    }

    fs.copyFileSync(backupFilePath, this.dbPath);
    this.logger.log(`Database restored from: ${backupFilePath}`);
  }
}

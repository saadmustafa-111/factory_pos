import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Attachment } from './entities/attachment.entity';

@Injectable()
export class AttachmentsService implements OnModuleInit {
  private readonly logger = new Logger(AttachmentsService.name);
  private storageDir!: string;

  /** Permitted entity types — prevents path traversal via crafted entityType values */
  private static readonly ALLOWED_ENTITY_TYPES = new Set([
    'customer',
    'sale',
    'inventory',
    'supplier',
    'payment',
  ]);

  private assertValidEntityType(entityType: string): void {
    if (!AttachmentsService.ALLOWED_ENTITY_TYPES.has(entityType)) {
      throw new BadRequestException(`Invalid entityType: ${entityType}`);
    }
  }

  constructor(
    @InjectRepository(Attachment)
    private readonly repo: Repository<Attachment>,
  ) {}

  onModuleInit() {
    // Store attachments next to the database directory
    const dbDir = process.env.DATABASE_DIR;
    this.storageDir = dbDir
      ? path.join(path.dirname(dbDir), 'attachments')
      : path.join(process.cwd(), 'attachments');

    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.logger.log(`Attachments storage: ${this.storageDir}`);
  }

  /** Save an uploaded file and record it in the database. */
  async save(
    file: Express.Multer.File,
    entityType: string,
    entityId: number,
  ): Promise<Attachment> {
    this.assertValidEntityType(entityType);
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;

    // Create entity-scoped sub-directory: <storageDir>/<entityType>/<entityId>/
    const dir = path.join(this.storageDir, entityType, String(entityId));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const record = this.repo.create({
      originalName: file.originalname,
      filename,
      mimetype: file.mimetype,
      size: file.size,
      entityType,
      entityId,
      filePath,
    });

    return this.repo.save(record);
  }

  /** List all attachments for a given entity record. */
  findByEntity(entityType: string, entityId: number): Promise<Attachment[]> {
    this.assertValidEntityType(entityType);
    return this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get a single attachment by id (throws if not found). */
  async findOne(id: number): Promise<Attachment> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Attachment #${id} not found`);
    return record;
  }

  /** Delete an attachment record and its file on disk. */
  async remove(id: number): Promise<void> {
    const record = await this.findOne(id);
    try {
      if (fs.existsSync(record.filePath)) {
        fs.unlinkSync(record.filePath);
      }
    } catch (err) {
      this.logger.warn(`Could not delete file ${record.filePath}`, err);
    }
    await this.repo.delete(id);
  }
}

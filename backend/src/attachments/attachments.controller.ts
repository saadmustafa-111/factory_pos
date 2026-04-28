import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttachmentsService } from './attachments.service';

@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  /**
   * POST /attachments?entityType=sale&entityId=1
   * multipart/form-data — field name must be "file"
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('entityType') entityType: string,
    @Query('entityId') entityIdStr: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!entityType) throw new BadRequestException('entityType is required');
    const entityId = Number(entityIdStr);
    if (!entityId) throw new BadRequestException('entityId must be a positive integer');

    return this.service.save(file, entityType, entityId);
  }

  /**
   * GET /attachments?entityType=sale&entityId=1
   * Returns list of attachment records for an entity.
   */
  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityIdStr: string,
  ) {
    if (!entityType || !entityIdStr) {
      throw new BadRequestException('entityType and entityId are required');
    }
    return this.service.findByEntity(entityType, Number(entityIdStr));
  }

  /**
   * GET /attachments/:id/file
   * Downloads / streams the actual file to the browser.
   */
  @Get(':id/file')
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const record = await this.service.findOne(id);
    res.download(record.filePath, record.originalName);
  }

  /**
   * DELETE /attachments/:id
   * Removes the DB record and the file from disk.
   */
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { success: true };
  }
}

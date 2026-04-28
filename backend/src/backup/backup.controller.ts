import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BackupService } from './backup.service';
import { GoogleDriveService } from './google-drive.service';

@UseGuards(JwtAuthGuard)
@Controller('backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /** GET /backup/status */
  @Get('status')
  async getStatus() {
    return this.backupService.getStatus();
  }

  /** POST /backup/now — manual local backup */
  @Post('now')
  @HttpCode(HttpStatus.OK)
  async backupNow() {
    try {
      const filePath = await this.backupService.createBackup('manual');
      return { success: true, filePath, timestamp: new Date().toISOString() };
    } catch (err) {
      this.logger.error('Manual backup failed', err);
      return { success: false, error: String(err) };
    }
  }

  /** POST /backup/cloud-now — triggered by renderer on Electron IPC signal */
  @Post('cloud-now')
  @HttpCode(HttpStatus.OK)
  async cloudNow() {
    try {
      const filePath = await this.backupService.createBackup('cloud');
      return { success: true, filePath, timestamp: new Date().toISOString() };
    } catch (err) {
      this.logger.error('Cloud backup failed', err);
      return { success: false, error: String(err) };
    }
  }

  /** POST /backup/restore — replaces live DB with selected backup file */
  @Post('restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Body('filePath') filePath: string) {
    if (!filePath) throw new BadRequestException('filePath is required');
    try {
      await this.backupService.restoreFromFile(filePath);
      return { success: true };
    } catch (err) {
      this.logger.error('Restore failed', err);
      throw new BadRequestException(String(err));
    }
  }

  /** GET /backup/auth-url — returns Google OAuth2 URL for the frontend to open */
  @Get('auth-url')
  getAuthUrl() {
    const url = this.googleDriveService.getAuthUrl();
    return { url };
  }

  /**
   * GET /backup/oauth-callback?code=...
   * Google redirects here after the user approves.
   * Saves refresh token and closes/redirects the window.
   */
  @Get('oauth-callback')
  async oauthCallback(@Query('code') code: string, @Res() res: Response) {
    try {
      await this.googleDriveService.handleOAuthCallback(code);
      // Return a plain HTML page the OAuth window can show
      res.send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2 style="color:#16a34a">✅ Google Drive Connected!</h2>
          <p>You can close this window and return to the app.</p>
          <script>setTimeout(()=>window.close(),2000)</script>
        </body></html>
      `);
    } catch (err) {
      this.logger.error('OAuth callback failed', err);
      res.status(400).send(`
        <html><body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2 style="color:#dc2626">❌ Connection Failed</h2>
          <p>${String(err)}</p>
        </body></html>
      `);
    }
  }

  /** DELETE /backup/disconnect — removes stored Google token */
  @Post('disconnect-google')
  @HttpCode(HttpStatus.OK)
  async disconnectGoogle() {
    this.googleDriveService.disconnectGoogle();
    return { success: true };
  }
}

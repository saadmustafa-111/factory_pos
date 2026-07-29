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
import { BackupService } from './backup.service';
import { GoogleDriveService } from './google-drive.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('backup')
export class BackupController {
  private readonly logger = new Logger(BackupController.name);

  constructor(
    private readonly backupService: BackupService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  /** GET /backup/status */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus() {
    return this.backupService.getStatus();
  }

  /** POST /backup/now — manual local backup */
  @Post('now')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    try {
      if (!code)
        throw new BadRequestException('Missing Google authorization code');
      await this.googleDriveService.handleOAuthCallback(code);
      // Return a plain HTML page the OAuth window can show.
      // Replace the browser URL so Google's one-time code is not left visible.
      res.send(`
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="referrer" content="no-referrer" />
          <title>Google Drive Connected</title>
          <script>
            window.history.replaceState({}, document.title, '/backup/oauth-callback');
          </script>
        </head>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2 style="color:#16a34a">Google Drive Connected!</h2>
          <p>You can close this window and return to the app.</p>
          <script>setTimeout(()=>window.close(),2000)</script>
        </body>
        </html>
      `);
    } catch (err) {
      this.logger.error('OAuth callback failed', err);
      res.status(400).send(`
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="referrer" content="no-referrer" />
          <title>Google Drive Connection Failed</title>
          <script>
            window.history.replaceState({}, document.title, '/backup/oauth-callback');
          </script>
        </head>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h2 style="color:#dc2626">Connection Failed</h2>
          <p>Please close this window and try connecting Google Drive again.</p>
        </body>
        </html>
      `);
    }
  }

  /** DELETE /backup/disconnect — removes stored Google token */
  @Post('disconnect-google')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnectGoogle() {
    this.googleDriveService.disconnectGoogle();
    return { success: true };
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const FOLDER_NAME = 'Factory POS Backups';
const TOKEN_FILENAME = 'gdrive-token.json';
const REDIRECT_PORT = 6101; // same as NestJS backend port
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/backup/oauth-callback`;

interface StoredToken {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}

@Injectable()
export class GoogleDriveService implements OnModuleInit {
  private readonly logger = new Logger(GoogleDriveService.name);

  private oauth2Client: OAuth2Client;
  private tokenPath: string;
  private clientId: string;
  private clientSecret: string;

  onModuleInit() {
    this.clientId = process.env.GDRIVE_CLIENT_ID ?? '';
    this.clientSecret = process.env.GDRIVE_CLIENT_SECRET ?? '';

    // Token lives in userData (derived from DATABASE_DIR set by Electron)
    const dbDir = process.env.DATABASE_DIR;
    const userData = dbDir ? path.dirname(dbDir) : process.cwd();
    this.tokenPath = path.join(userData, TOKEN_FILENAME);

    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      REDIRECT_URI,
    );

    // Load saved token if present
    const saved = this.loadToken();
    if (saved) {
      this.oauth2Client.setCredentials(saved);
      this.logger.log('Google Drive: Loaded saved OAuth token');
    }
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  getAuthUrl(): string {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        'GDRIVE_CLIENT_ID and GDRIVE_CLIENT_SECRET must be set in environment variables',
      );
    }
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });
  }

  async handleOAuthCallback(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    this.saveToken(tokens as StoredToken);
    this.logger.log('Google Drive: OAuth token saved');
  }

  async isConnected(): Promise<boolean> {
    const token = this.loadToken();
    return !!token?.refresh_token;
  }

  disconnectGoogle(): void {
    try {
      if (fs.existsSync(this.tokenPath)) {
        fs.unlinkSync(this.tokenPath);
      }
      this.oauth2Client.revokeCredentials().catch(() => {
        /* best effort */
      });
    } catch (err) {
      this.logger.warn('Failed to disconnect Google Drive', err);
    }
  }

  // ─── UPLOAD ───────────────────────────────────────────────────────────────

  async uploadIfOnline(localFilePath: string): Promise<void> {
    const online = await this.checkInternetConnectivity();
    if (!online) {
      this.logger.log('Offline — skipping Google Drive upload');
      return;
    }

    if (!(await this.isConnected())) {
      this.logger.log('Google Drive not connected — skipping upload');
      return;
    }

    try {
      await this.uploadFileToDrive(localFilePath);
    } catch (err) {
      this.logger.error('Google Drive upload failed', err);
    }
  }

  private async uploadFileToDrive(localFilePath: string): Promise<void> {
    const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    const filename = path.basename(localFilePath);

    // 1. Find or create folder
    const folderId = await this.getOrCreateFolder(drive);

    // 2. Upload file
    await drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: 'application/octet-stream',
        body: fs.createReadStream(localFilePath),
      },
    });

    this.logger.log(`Uploaded to Google Drive: ${filename}`);

    // 3. Update last cloud backup timestamp via BackupService
    // We do this inline since circular dep is avoided by using file directly
    const dbDir = process.env.DATABASE_DIR;
    const userData = dbDir ? path.dirname(dbDir) : process.cwd();
    const metaPath = path.join(userData, 'backup-meta.json');
    try {
      let meta: any = {};
      if (fs.existsSync(metaPath)) {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      }
      meta.lastCloudBackup = new Date().toISOString();
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
    } catch {
      /* best effort */
    }
    // NOTE: No pruning — all cloud backups are kept forever
  }

  private async getOrCreateFolder(drive: drive_v3.Drive): Promise<string> {
    // Look for existing folder
    const list = await drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive',
    });

    if (list.data.files && list.data.files.length > 0) {
      return list.data.files[0].id!;
    }

    // Create folder
    const created = await drive.files.create({
      requestBody: {
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    });

    this.logger.log(`Created Google Drive folder: ${FOLDER_NAME}`);
    return created.data.id!;
  }

  // ─── CONNECTIVITY CHECK ───────────────────────────────────────────────────

  private checkInternetConnectivity(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = https.get(
        'https://www.google.com',
        { timeout: 5000 },
        (res) => {
          resolve(res.statusCode !== undefined && res.statusCode < 500);
          res.resume();
        },
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  // ─── TOKEN HELPERS ────────────────────────────────────────────────────────

  private loadToken(): StoredToken | null {
    try {
      if (fs.existsSync(this.tokenPath)) {
        return JSON.parse(
          fs.readFileSync(this.tokenPath, 'utf-8'),
        ) as StoredToken;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private saveToken(token: StoredToken): void {
    try {
      fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2), 'utf-8');
    } catch (err) {
      this.logger.warn('Failed to save Google Drive token', err);
    }
  }
}

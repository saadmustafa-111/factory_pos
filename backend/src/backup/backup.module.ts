import { Module } from '@nestjs/common';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { GoogleDriveService } from './google-drive.service';

@Module({
  controllers: [BackupController],
  providers: [BackupService, GoogleDriveService],
  exports: [BackupService, GoogleDriveService],
})
export class BackupModule {}

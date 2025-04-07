import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export interface BackupResult {
  path: string;
  timestamp: string;
}

export class BackupService {
  private backupDir: string;
  private retentionDays: number;

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || '/backups';
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '7');
  }

  async createBackup(): Promise<BackupResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `taskwarrior-backup-${timestamp}.tar.gz`);

    // Create backup
    await execAsync(`tar -czf ${backupPath} -C ${process.env.TASKWARRIOR_DATA_DIR} .`);

    // Verify backup
    const backupExists = fs.existsSync(backupPath);
    if (!backupExists) {
      throw new Error('Backup file was not created');
    }

    // Clean up old backups
    await this.cleanupOldBackups();

    return {
      path: backupPath,
      timestamp: new Date().toISOString(),
    };
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = new Date();

      for (const file of files) {
        if (!file.startsWith('taskwarrior-backup-')) continue;

        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const fileAge = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        if (fileAge > this.retentionDays) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to clean up old backups:', error);
    }
  }
}

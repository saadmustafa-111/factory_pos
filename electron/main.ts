import { app, BrowserWindow, dialog, ipcMain, net, shell } from 'electron';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

// ─── INTERNET + CLOUD BACKUP SCHEDULER ───────────────────────────────────────

function isOnline(): boolean {
  return net.isOnline();
}

function getLastCloudBackup(): Date | null {
  try {
    const userDataPath = app.getPath('userData');
    const metaPath = path.join(userDataPath, 'backup-meta.json');
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      if (meta.lastCloudBackup) return new Date(meta.lastCloudBackup);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function scheduleCloudBackupCheck() {
  // Check every 30 minutes
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!isOnline()) return;

    const lastCloud = getLastCloudBackup();
    const msIn24h = 24 * 60 * 60 * 1000;
    const needsBackup = !lastCloud || Date.now() - lastCloud.getTime() > msIn24h;

    if (needsBackup) {
      // Signal the renderer to POST /backup/cloud-now
      mainWindow.webContents.send('trigger-cloud-backup');
    }
  }, 30 * 60 * 1000); // 30 minutes
}

// ─── IPC HANDLERS ─────────────────────────────────────────────────────────────

ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
});

// ─── BACKEND STARTUP ──────────────────────────────────────────────────────────

async function startBackend() {
  if (isDev) return;

  const backendDist = path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  if (!existsSync(backendDist)) {
    console.error('Backend dist not found at:', backendDist);
    return;
  }

  // Store the SQLite database in the user's writable data directory
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  process.env.DATABASE_DIR = dbDir;

  // Run the NestJS backend in-process — Electron has Node.js built in,
  // no need to spawn an external node process.
  try {
    require(backendDist);
  } catch (err) {
    console.error('Failed to start backend:', err);
  }
}

// ─── WINDOW ───────────────────────────────────────────────────────────────────

function createWindow() {
  const preloadPath = isDev
    ? path.join(process.cwd(), 'electron', 'preload.js')
    : path.join(__dirname, 'preload.js');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Steel & Cement POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  await startBackend();
  // Give NestJS a moment to bind its port before opening the window
  if (!isDev) await new Promise((r) => setTimeout(r, 1500));
  createWindow();
  scheduleCloudBackupCheck();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


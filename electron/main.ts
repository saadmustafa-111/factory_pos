import { app, BrowserWindow, dialog, ipcMain, net, shell } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

// ─── CRASH LOGGING ────────────────────────────────────────────────────────────

function getLogPath() {
  return path.join(app.getPath('userData'), 'app.log');
}

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  try { appendFileSync(getLogPath(), line); } catch { /* ignore */ }
}

process.on('uncaughtException', (err) => {
  log(`[uncaughtException] ${err?.stack ?? err}`);
});

process.on('unhandledRejection', (reason) => {
  log(`[unhandledRejection] ${String(reason)}`);
});

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
  // Only allow safe http/https URLs — prevents XSS from opening arbitrary protocols
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
  } catch {
    return; // invalid URL
  }
  await shell.openExternal(url);
});

// ─── BACKEND STARTUP ──────────────────────────────────────────────────────────

async function startBackend() {
  if (isDev) return;

  const backendDist = path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  log(`[Backend] resourcesPath: ${process.resourcesPath}`);
  log(`[Backend] Looking for dist at: ${backendDist}`);
  if (!existsSync(backendDist)) {
    log(`[Backend] dist NOT FOUND at: ${backendDist}`);
    return;
  }
  log('[Backend] dist found, loading...');

  // Store the SQLite database in the user's writable data directory
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'database');
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true });

  process.env.DATABASE_DIR = dbDir;

  // Google Drive OAuth credentials — injected at build time from gdrive-credentials.ts
  // (that file is gitignored; CI generates it from repository secrets)
  const { GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET } = await import('./gdrive-credentials');
  process.env.GDRIVE_CLIENT_ID = GDRIVE_CLIENT_ID;
  process.env.GDRIVE_CLIENT_SECRET = GDRIVE_CLIENT_SECRET;

  // Generate a per-installation JWT secret (created once, persisted to userData)
  const secretPath = path.join(userDataPath, '.jwt-secret');
  let jwtSecret: string;
  if (existsSync(secretPath)) {
    jwtSecret = readFileSync(secretPath, 'utf-8').trim();
  } else {
    jwtSecret = randomBytes(48).toString('hex');
    writeFileSync(secretPath, jwtSecret, { mode: 0o600 }); // owner-read only
  }
  process.env.JWT_SECRET = jwtSecret;

  // Run the NestJS backend in-process — Electron has Node.js built in,
  // no need to spawn an external node process.
  try {
    log(`[Backend] Calling require on: ${backendDist}`);
    require(backendDist);
    log('[Backend] require() returned (NestJS bootstrapping in background)');
  } catch (err) {
    log(`[Backend] Failed to start. Error: ${(err as Error)?.stack ?? err}`);
  }
}

// ─── BACKEND HEALTH CHECK ─────────────────────────────────────────────────────

async function waitForBackend(maxWaitMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await net.fetch('http://localhost:3001/health');
      if (res.ok) {
        log(`[Backend] Health check passed after ${Date.now() - start}ms`);
        return true;
      }
    } catch {
      // backend not ready yet — keep retrying
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  log(`[Backend] Did not respond within ${maxWaitMs}ms`);
  return false;
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
    mainWindow.webContents.openDevTools();
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.on('did-finish-load', () => {
    // Re-deliver backend state in case it resolved before the renderer was ready
    if (backendState.status !== 'pending') sendBackendStateToRenderer();
  });

  mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
    log(`[Renderer] did-fail-load: ${code} ${desc} url=${url}`);
  });

  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    log(`[Renderer] render-process-gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── BACKEND STATE → IPC ─────────────────────────────────────────────────────

let backendState: { status: 'pending' | 'ready' | 'error'; message?: string } = {
  status: 'pending',
};

function sendBackendStateToRenderer() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (backendState.status === 'ready') {
    mainWindow.webContents.send('backend-ready');
  } else if (backendState.status === 'error') {
    mainWindow.webContents.send('backend-error', backendState.message ?? '');
  }
}

async function startBackendAndNotify() {
  await startBackend();
  const ok = await waitForBackend();
  if (ok) {
    backendState = { status: 'ready' };
    log('[Backend] Sending backend-ready to renderer');
  } else {
    const msg = 'Backend did not respond in time. Please restart the application.';
    backendState = { status: 'error', message: msg };
    log('[Backend] Sending backend-error to renderer');
  }
  sendBackendStateToRenderer();
}

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  log(`[App] Starting — version ${app.getVersion()} — packaged=${app.isPackaged} — platform=${process.platform}`);
  createWindow();               // show window immediately
  startBackendAndNotify();      // start backend in background; notifies renderer when ready
  scheduleCloudBackupCheck();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});


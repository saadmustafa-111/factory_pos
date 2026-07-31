"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const node_path_1 = __importDefault(require("node:path"));
const isDev = !electron_1.app.isPackaged;
let mainWindow = null;
// ─── CRASH LOGGING ────────────────────────────────────────────────────────────
function getLogPath() {
    return node_path_1.default.join(electron_1.app.getPath('userData'), 'app.log');
}
function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    try {
        (0, node_fs_1.appendFileSync)(getLogPath(), line);
    }
    catch { /* ignore */ }
}
process.on('uncaughtException', (err) => {
    log(`[uncaughtException] ${err?.stack ?? err}`);
});
process.on('unhandledRejection', (reason) => {
    log(`[unhandledRejection] ${String(reason)}`);
});
// ─── INTERNET + CLOUD BACKUP SCHEDULER ───────────────────────────────────────
function isOnline() {
    return electron_1.net.isOnline();
}
function getLastCloudBackup() {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const metaPath = node_path_1.default.join(userDataPath, 'backup-meta.json');
        if ((0, node_fs_1.existsSync)(metaPath)) {
            const meta = JSON.parse((0, node_fs_1.readFileSync)(metaPath, 'utf-8'));
            if (meta.lastCloudBackup)
                return new Date(meta.lastCloudBackup);
        }
    }
    catch {
        /* ignore */
    }
    return null;
}
function scheduleCloudBackupCheck() {
    // Check every 30 minutes
    setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed())
            return;
        if (!isOnline())
            return;
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
electron_1.ipcMain.handle('show-open-dialog', async (_event, options) => {
    if (!mainWindow)
        return { canceled: true, filePaths: [] };
    return electron_1.dialog.showOpenDialog(mainWindow, options);
});
electron_1.ipcMain.handle('open-external', async (_event, url) => {
    // Only allow safe http/https URLs — prevents XSS from opening arbitrary protocols
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
            return;
    }
    catch {
        return; // invalid URL
    }
    await electron_1.shell.openExternal(url);
});
// ─── BACKEND STARTUP ──────────────────────────────────────────────────────────
async function startBackend() {
    if (isDev)
        return;
    const backendDist = node_path_1.default.join(process.resourcesPath, 'backend', 'dist', 'main.js');
    log(`[Backend] resourcesPath: ${process.resourcesPath}`);
    log(`[Backend] Looking for dist at: ${backendDist}`);
    if (!(0, node_fs_1.existsSync)(backendDist)) {
        log(`[Backend] dist NOT FOUND at: ${backendDist}`);
        return;
    }
    log('[Backend] dist found, loading...');
    // Store the SQLite database in the user's writable data directory
    const userDataPath = electron_1.app.getPath('userData');
    const dbDir = node_path_1.default.join(userDataPath, 'database');
    if (!(0, node_fs_1.existsSync)(dbDir))
        (0, node_fs_1.mkdirSync)(dbDir, { recursive: true });
    process.env.DATABASE_DIR = dbDir;
    // Google Drive OAuth credentials — injected at build time from gdrive-credentials.ts
    // (that file is gitignored; CI generates it from repository secrets)
    const { GDRIVE_CLIENT_ID, GDRIVE_CLIENT_SECRET } = await Promise.resolve().then(() => __importStar(require('./gdrive-credentials')));
    process.env.GDRIVE_CLIENT_ID = GDRIVE_CLIENT_ID;
    process.env.GDRIVE_CLIENT_SECRET = GDRIVE_CLIENT_SECRET;
    // Generate a per-installation JWT secret (created once, persisted to userData)
    const secretPath = node_path_1.default.join(userDataPath, '.jwt-secret');
    let jwtSecret;
    if ((0, node_fs_1.existsSync)(secretPath)) {
        jwtSecret = (0, node_fs_1.readFileSync)(secretPath, 'utf-8').trim();
    }
    else {
        jwtSecret = (0, node_crypto_1.randomBytes)(48).toString('hex');
        (0, node_fs_1.writeFileSync)(secretPath, jwtSecret, { mode: 0o600 }); // owner-read only
    }
    process.env.JWT_SECRET = jwtSecret;
    // Run the NestJS backend in-process — Electron has Node.js built in,
    // no need to spawn an external node process.
    try {
        log(`[Backend] Calling require on: ${backendDist}`);
        require(backendDist);
        log('[Backend] require() returned (NestJS bootstrapping in background)');
    }
    catch (err) {
        log(`[Backend] Failed to start. Error: ${err?.stack ?? err}`);
    }
}
// ─── BACKEND HEALTH CHECK ─────────────────────────────────────────────────────
async function waitForBackend(maxWaitMs = 15000) {
    const start = Date.now();
    let delayMs = 75;
    while (Date.now() - start < maxWaitMs) {
        try {
            const res = await electron_1.net.fetch('http://127.0.0.1:6101/health');
            if (res.ok) {
                log(`[Backend] Health check passed after ${Date.now() - start}ms`);
                return true;
            }
        }
        catch {
            // backend not ready yet — keep retrying
        }
        await new Promise((r) => setTimeout(r, delayMs));
        delayMs = Math.min(400, delayMs + 50);
    }
    log(`[Backend] Did not respond within ${maxWaitMs}ms`);
    return false;
}
// ─── WINDOW ───────────────────────────────────────────────────────────────────
function createWindow() {
    const preloadPath = isDev
        ? node_path_1.default.join(process.cwd(), 'electron', 'preload.js')
        : node_path_1.default.join(__dirname, 'preload.js');
    mainWindow = new electron_1.BrowserWindow({
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
    }
    else {
        const indexPath = node_path_1.default.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
        mainWindow.loadFile(indexPath);
    }
    mainWindow.webContents.on('did-finish-load', () => {
        // Re-deliver backend state in case it resolved before the renderer was ready
        if (backendState.status !== 'pending')
            sendBackendStateToRenderer();
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
let backendState = {
    status: 'pending',
};
function sendBackendStateToRenderer() {
    if (!mainWindow || mainWindow.isDestroyed())
        return;
    if (backendState.status === 'ready') {
        mainWindow.webContents.send('backend-ready');
    }
    else if (backendState.status === 'error') {
        mainWindow.webContents.send('backend-error', backendState.message ?? '');
    }
}
async function startBackendAndNotify() {
    await startBackend();
    const ok = await waitForBackend();
    if (ok) {
        backendState = { status: 'ready' };
        log('[Backend] Sending backend-ready to renderer');
    }
    else {
        const msg = 'Backend did not respond in time. Please restart the application.';
        backendState = { status: 'error', message: msg };
        log('[Backend] Sending backend-error to renderer');
    }
    sendBackendStateToRenderer();
}
// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────
electron_1.app.whenReady().then(() => {
    log(`[App] Starting — version ${electron_1.app.getVersion()} — packaged=${electron_1.app.isPackaged} — platform=${process.platform}`);
    createWindow(); // show window immediately
    startBackendAndNotify(); // start backend in background; notifies renderer when ready
    scheduleCloudBackupCheck();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});

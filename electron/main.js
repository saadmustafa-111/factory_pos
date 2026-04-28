"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const isDev = !electron_1.app.isPackaged;
async function startBackend() {
    if (isDev)
        return;
    const backendDist = node_path_1.default.join(process.resourcesPath, 'backend', 'dist', 'main.js');
    if (!(0, node_fs_1.existsSync)(backendDist)) {
        console.error('Backend dist not found at:', backendDist);
        return;
    }
    // Store the SQLite database in the user's writable data directory
    const userDataPath = electron_1.app.getPath('userData');
    const dbDir = node_path_1.default.join(userDataPath, 'database');
    if (!(0, node_fs_1.existsSync)(dbDir))
        (0, node_fs_1.mkdirSync)(dbDir, { recursive: true });
    process.env.DATABASE_DIR = dbDir;
    // Run the NestJS backend in-process — Electron has Node.js built in,
    // no need to spawn an external node process.
    try {
        require(backendDist);
    }
    catch (err) {
        console.error('Failed to start backend:', err);
    }
}
function createWindow() {
    const preloadPath = isDev
        ? node_path_1.default.join(process.cwd(), 'electron', 'preload.js')
        : node_path_1.default.join(__dirname, 'preload.js');
    const win = new electron_1.BrowserWindow({
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
        win.loadURL('http://localhost:5173');
    }
    else {
        const indexPath = node_path_1.default.join(process.resourcesPath, 'frontend', 'dist', 'index.html');
        win.loadFile(indexPath);
    }
}
electron_1.app.whenReady().then(async () => {
    await startBackend();
    // Give NestJS a moment to bind its port before opening the window
    if (!isDev)
        await new Promise((r) => setTimeout(r, 1500));
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});

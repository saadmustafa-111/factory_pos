import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

let backendProcess: ReturnType<typeof spawn> | null = null;
const isDev = !app.isPackaged;

async function startBackend() {
  if (isDev) return;

  const backendDist = path.join(process.cwd(), 'backend', 'dist', 'main.js');
  if (!existsSync(backendDist)) return;

  backendProcess = spawn('node', [backendDist], {
    cwd: path.join(process.cwd(), 'backend'),
    stdio: 'ignore',
  });
}

function createWindow() {
  const preloadPath = isDev
    ? path.join(process.cwd(), 'electron', 'preload.js')
    : path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Factory POS',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(process.cwd(), 'frontend', 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') app.quit();
});

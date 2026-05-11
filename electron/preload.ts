import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('factoryPos', {
  appName: 'Steel & Cement POS',

  // Opens native file dialog; returns Electron.OpenDialogReturnValue
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('show-open-dialog', options),

  // Opens a URL in the system default browser (for OAuth)
  openExternal: (url: string) =>
    ipcRenderer.invoke('open-external', url),

  // Register a listener for the cloud-backup trigger sent by main process
  onTriggerCloudBackup: (callback: () => void) => {
    ipcRenderer.on('trigger-cloud-backup', callback);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('trigger-cloud-backup', callback);
  },

  // Backend lifecycle events — used by BackendGate to show loading screen
  onBackendReady: (callback: () => void) => {
    ipcRenderer.on('backend-ready', callback);
    return () => ipcRenderer.removeListener('backend-ready', callback);
  },

  onBackendError: (callback: (message: string) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on('backend-error', handler);
    return () => ipcRenderer.removeListener('backend-error', handler);
  },
});


"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('factoryPos', {
    appName: 'Steel & Cement POS',
    // Opens native file dialog; returns Electron.OpenDialogReturnValue
    showOpenDialog: (options) => electron_1.ipcRenderer.invoke('show-open-dialog', options),
    // Opens a URL in the system default browser (for OAuth)
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    // Register a listener for the cloud-backup trigger sent by main process
    onTriggerCloudBackup: (callback) => {
        electron_1.ipcRenderer.on('trigger-cloud-backup', callback);
        // Return a cleanup function
        return () => electron_1.ipcRenderer.removeListener('trigger-cloud-backup', callback);
    },
});

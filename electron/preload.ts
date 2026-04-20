import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('factoryPos', {
  appName: 'Factory POS',
});

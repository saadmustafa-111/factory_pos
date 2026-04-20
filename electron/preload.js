const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('factoryPos', {
  appName: 'Factory POS',
});

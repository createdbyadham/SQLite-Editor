import { contextBridge, ipcRenderer } from 'electron';

console.log('Preload script starting...');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    saveDatabase: async (filePath: string, data: Uint8Array) => {
      console.log('Calling saveDatabase from preload:', filePath);
      return ipcRenderer.invoke('save-database', filePath, data);
    },
    readDatabase: async (filePath: string) => {
      console.log('Calling readDatabase from preload:', filePath);
      return ipcRenderer.invoke('read-database', filePath);
    },
    minimizeWindow: () => {
      return ipcRenderer.invoke('minimize-window');
    },
    maximizeWindow: () => {
      return ipcRenderer.invoke('maximize-window');
    },
    closeWindow: () => {
      return ipcRenderer.invoke('close-window');
    },
  }
);

console.log('Preload script completed, electron API exposed'); 
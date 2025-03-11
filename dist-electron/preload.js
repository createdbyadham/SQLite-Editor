"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
console.log('Preload script starting...');
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    saveDatabase: async (filePath, data) => {
        console.log('Calling saveDatabase from preload:', filePath);
        return electron_1.ipcRenderer.invoke('save-database', filePath, data);
    },
    readDatabase: async (filePath) => {
        console.log('Calling readDatabase from preload:', filePath);
        return electron_1.ipcRenderer.invoke('read-database', filePath);
    },
    minimizeWindow: () => {
        return electron_1.ipcRenderer.invoke('minimize-window');
    },
    maximizeWindow: () => {
        return electron_1.ipcRenderer.invoke('maximize-window');
    },
    closeWindow: () => {
        return electron_1.ipcRenderer.invoke('close-window');
    },
});
console.log('Preload script completed, electron API exposed');
//# sourceMappingURL=preload.js.map
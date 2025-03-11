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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let mainWindow = null;
const createWindow = () => {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        frame: false, // Remove default window frame
        icon: path.join(__dirname, '../public/appicon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            webSecurity: false // Allow loading local files
        }
    });
    console.log('Created main window with preload script:', path.join(__dirname, 'preload.js'));
    // In development, use the Vite dev server
    if (process.env.NODE_ENV === 'development') {
        console.log('Running in development mode, loading from localhost:3000');
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        // In production, load the built files
        console.log('Running in production mode, loading from dist/index.html');
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded successfully');
    });
    // Window control handlers
    electron_1.ipcMain.handle('minimize-window', () => {
        if (!mainWindow)
            return;
        mainWindow.minimize();
    });
    electron_1.ipcMain.handle('maximize-window', () => {
        if (!mainWindow)
            return;
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow.maximize();
        }
    });
    electron_1.ipcMain.handle('close-window', () => {
        if (!mainWindow)
            return;
        mainWindow.close();
    });
};
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Handle saving database changes
electron_1.ipcMain.handle('save-database', async (_event, filePath, data) => {
    try {
        console.log('Received save request:', { filePath, dataLength: data.length });
        // Convert to absolute path if needed
        const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
        console.log('Absolute file path:', absoluteFilePath);
        // Ensure the directory exists
        const directory = path.dirname(absoluteFilePath);
        await fs.promises.mkdir(directory, { recursive: true });
        console.log('Writing file to:', absoluteFilePath);
        await fs.promises.writeFile(absoluteFilePath, data);
        console.log('File written successfully');
        return { success: true, filePath: absoluteFilePath };
    }
    catch (error) {
        console.error('Error saving database:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
});
// Handle reading database file
electron_1.ipcMain.handle('read-database', async (_event, filePath) => {
    try {
        console.log('Reading database from:', filePath);
        let absoluteFilePath = filePath;
        // If it's not an absolute path, try different ways to resolve it
        if (!path.isAbsolute(filePath)) {
            // First try relative to current working directory
            let testPath = path.resolve(process.cwd(), filePath);
            if (fs.existsSync(testPath)) {
                absoluteFilePath = testPath;
            }
            else {
                // If that doesn't exist, try relative to user's home directory
                testPath = path.resolve(electron_1.app.getPath('home'), filePath);
                if (fs.existsSync(testPath)) {
                    absoluteFilePath = testPath;
                }
                else {
                    // If that doesn't exist, try relative to downloads directory
                    testPath = path.resolve(electron_1.app.getPath('downloads'), filePath);
                    if (fs.existsSync(testPath)) {
                        absoluteFilePath = testPath;
                    }
                }
            }
        }
        console.log('Resolved absolute file path:', absoluteFilePath);
        if (!fs.existsSync(absoluteFilePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        // Read the file
        const data = await fs.promises.readFile(absoluteFilePath);
        console.log('Database read successfully, size:', data.length);
        return { success: true, data, filePath: absoluteFilePath };
    }
    catch (error) {
        console.error('Error reading database:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
});
//# sourceMappingURL=main.js.map
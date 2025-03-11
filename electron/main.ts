import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
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
  } else {
    // In production, load the built files
    console.log('Running in production mode, loading from dist/index.html');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Window loaded successfully');
  });

  // Window control handlers
  ipcMain.handle('minimize-window', () => {
    if (!mainWindow) return;
    mainWindow.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('close-window', () => {
    if (!mainWindow) return;
    mainWindow.close();
  });
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle saving database changes
ipcMain.handle('save-database', async (_event, filePath: string, data: Buffer) => {
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
  } catch (error) {
    console.error('Error saving database:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
});

// Handle reading database file
ipcMain.handle('read-database', async (_event, filePath: string) => {
  try {
    console.log('Reading database from:', filePath);
    
    let absoluteFilePath = filePath;
    
    // If it's not an absolute path, try different ways to resolve it
    if (!path.isAbsolute(filePath)) {
      // First try relative to current working directory
      let testPath = path.resolve(process.cwd(), filePath);
      if (fs.existsSync(testPath)) {
        absoluteFilePath = testPath;
      } else {
        // If that doesn't exist, try relative to user's home directory
        testPath = path.resolve(app.getPath('home'), filePath);
        if (fs.existsSync(testPath)) {
          absoluteFilePath = testPath;
        } else {
          // If that doesn't exist, try relative to downloads directory
          testPath = path.resolve(app.getPath('downloads'), filePath);
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
  } catch (error) {
    console.error('Error reading database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}); 
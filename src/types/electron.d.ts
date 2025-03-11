interface ElectronAPI {
  saveDatabase: (filePath: string, data: Uint8Array) => Promise<{ success: boolean; error?: string }>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  readDatabase: (filePath: string) => Promise<{ success: boolean; data?: Buffer; error?: string; filePath?: string }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export interface ElectronFile extends File {
  path: string;
} 
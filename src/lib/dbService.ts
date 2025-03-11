// This service handles SQLite database operations
import { toast } from "@/hooks/use-toast";

export interface TableInfo {
  name: string;
  sql: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  pk: number;
}

export interface RowData {
  [key: string]: unknown;
}

interface SqlJs {
  Database: new (data: Uint8Array) => Database;
}

interface Database {
  exec(sql: string): QueryResults[];
  close(): void;
  export(): Uint8Array;
}

interface QueryResults {
  columns?: string[];
  values?: unknown[][];
}

declare global {
  interface Window {
    SQL: SqlJs;
    initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<SqlJs>;
    electron?: {
      saveDatabase: (filePath: string, data: Uint8Array) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

class DbService {
  private db: Database | null = null;
  private SQL: SqlJs | null = null;
  private isInitializing = false;
  private initPromise: Promise<DbService> | null = null;
  private currentTables: TableInfo[] = [];
  private lastSavedData: Uint8Array | null = null;
  public currentFilePath: string | null = null;
  
  async init() {
    if (this.SQL) {
      console.log("SQL.js already initialized");
      return this;
    }

    if (this.initPromise) {
      console.log("Waiting for existing initialization to complete");
      await this.initPromise;
      return this;
    }

    console.log("Starting SQL.js initialization");
    this.isInitializing = true;
    this.initPromise = new Promise((resolve, reject) => {
      const initializeAsync = async () => {
        try {
          // Load SQL.js script if not already loaded
          if (!window.initSqlJs) {
            console.log("Loading SQL.js script");
            const script = document.createElement('script');
            script.src = process.env.NODE_ENV === 'production' ? './sql-wasm.js' : '/sql-wasm.js';
            script.async = true;
            document.body.appendChild(script);

            await new Promise<void>((resolveScript) => {
              script.onload = () => {
                console.log("SQL.js script loaded successfully");
                resolveScript();
              };
              script.onerror = () => {
                console.error("Failed to load SQL.js script");
                reject(new Error('Failed to load SQL.js script'));
              };
            });
          } else {
            console.log("SQL.js script already loaded");
          }

          // Initialize SQL.js with WASM file
          console.log("Initializing SQL.js with WASM file");
          this.SQL = await window.initSqlJs({
            locateFile: (file: string) => {
              console.log("Locating file:", file);
              return process.env.NODE_ENV === 'production' ? `./${file}` : `/${file}`;
            }
          });

          console.log("SQL.js initialized successfully");
          this.isInitializing = false;
          resolve();
        } catch (error) {
          this.isInitializing = false;
          console.error("Failed to initialize SQL.js:", error);
          toast({
            title: "Error",
            description: "Failed to initialize database engine",
            variant: "destructive"
          });
          reject(error);
        }
      };
      
      void initializeAsync();
    });

    await this.initPromise;
    return this;
  }

  async loadDbFromArrayBuffer(buffer: ArrayBuffer, filePath?: string) {
    try {
      console.log("Starting database load from ArrayBuffer");
      if (!this.SQL) {
        console.log("SQL.js not initialized, initializing now");
        await this.init();
      }
      
      if (!this.SQL) {
        throw new Error("SQL.js failed to initialize");
      }

      // Convert ArrayBuffer to Uint8Array properly
      console.log("Converting ArrayBuffer to Uint8Array, size:", buffer.byteLength);
      const data = new Uint8Array(buffer);
      
      // Store the initial data and file path
      this.lastSavedData = data;
      if (filePath) {
        this.currentFilePath = filePath;
      }
      
      // Close existing database if any
      if (this.db) {
        console.log("Closing existing database connection");
        this.db.close();
        this.db = null;
      }

      try {
        // Create new database instance
        console.log("Creating new database instance");
        this.db = new this.SQL.Database(data);
        
        // Verify database is valid by trying to read tables
        console.log("Verifying database by reading tables");
        this.currentTables = this.getTables();
        console.log("Database loaded successfully with tables:", this.currentTables);
        
        return true;
      } catch (dbError) {
        console.error("Database creation error:", dbError);
        this.currentTables = [];
        this.currentFilePath = null;
        toast({
          title: "Invalid Database",
          description: "The file appears to be corrupted or not a valid SQLite database.",
          variant: "destructive"
        });
        return false;
      }
    } catch (error) {
      console.error("Failed to load database:", error);
      this.currentTables = [];
      this.currentFilePath = null;
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load database",
        variant: "destructive"
      });
      return false;
    }
  }

  getTables(): TableInfo[] {
    if (!this.db) {
      return this.currentTables;
    }
    
    try {
      const tables = this.db.exec(
        "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      
      if (tables.length === 0 || !tables[0].values) {
        return [];
      }
      
      this.currentTables = tables[0].values.map((row) => ({
        name: row[0] as string,
        sql: row[1] as string
      }));
      
      return this.currentTables;
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast({
        title: "Error",
        description: "Failed to retrieve table list",
        variant: "destructive"
      });
      return this.currentTables;
    }
  }

  getTableColumns(tableName: string): ColumnInfo[] {
    if (!this.db) {
      return [];
    }
    
    try {
      const pragmaResult = this.db.exec(`PRAGMA table_info('${tableName}')`);
      
      if (pragmaResult.length === 0 || !pragmaResult[0].values) {
        return [];
      }
      
      return pragmaResult[0].values.map((row) => ({
        cid: row[0] as number,
        name: row[1] as string,
        type: row[2] as string,
        notnull: row[3] as number,
        pk: row[5] as number
      }));
    } catch (error) {
      console.error(`Error fetching columns for ${tableName}:`, error);
      toast({
        title: "Error",
        description: `Failed to retrieve columns for table ${tableName}`,
        variant: "destructive"
      });
      return [];
    }
  }

  getTableData(tableName: string, limit = 1000, offset = 0): { columns: string[], rows: RowData[] } {
    if (!this.db) {
      return { columns: [], rows: [] };
    }
    
    try {
      // First get the column information
      const columns = this.getTableColumns(tableName);
      const columnNames = columns.map(col => col.name);
      
      // Execute the query with proper column names
      const result = this.db.exec(
        `SELECT ${columnNames.map(name => `\`${name}\``).join(', ')} FROM \`${tableName}\` LIMIT ${limit} OFFSET ${offset}`
      );
      
      if (result.length === 0 || !result[0].values) {
        return { columns: columnNames, rows: [] };
      }
      
      // Map the results to row objects
      const rows = result[0].values.map((row) => {
        const rowData: RowData = {};
        columnNames.forEach((colName, index) => {
          rowData[colName] = row[index];
        });
        return rowData;
      });
      
      return { columns: columnNames, rows };
    } catch (error) {
      console.error(`Error fetching data for ${tableName}:`, error);
      toast({
        title: "Error",
        description: `Failed to retrieve data for table ${tableName}`,
        variant: "destructive"
      });
      return { columns: [], rows: [] };
    }
  }

  executeQuery(sql: string): { columns: string[], rows: unknown[][] } | null {
    if (!this.db) {
      return null;
    }
    
    try {
      const result = this.db.exec(sql);
      
      if (result.length === 0) {
        return { columns: [], rows: [] };
      }
      
      return {
        columns: result[0].columns || [],
        rows: result[0].values || []
      };
    } catch (error) {
      console.error("Query execution error:", error);
      toast({
        title: "SQL Error",
        description: String(error),
        variant: "destructive"
      });
      return null;
    }
  }

  updateRow(tableName: string, oldRow: RowData, newRow: RowData): boolean {
    if (!this.db) return false;

    try {
      // Get primary key column
      const primaryKeyColumn = this.getTableColumns(tableName).find(col => col.pk === 1);
      if (!primaryKeyColumn) {
        throw new Error('Table has no primary key');
      }

      // Build SET clause with placeholders
      const setClause = Object.entries(newRow)
        .filter(([column]) => column !== primaryKeyColumn.name) // Don't update PK
        .map(([column, value]) => {
          if (value === null) {
            return `\`${column}\` = NULL`;
          }
          return `\`${column}\` = '${value}'`;
        })
        .join(', ');

      // Build WHERE clause using PK
      const whereValue = oldRow[primaryKeyColumn.name];
      const whereClause = `\`${primaryKeyColumn.name}\` = '${whereValue}'`;

      // Execute update
      const sql = `UPDATE \`${tableName}\` SET ${setClause} WHERE ${whereClause}`;
      this.db.exec(sql);

      // Export and save the updated database
      this.lastSavedData = this.db.export();

      // Save changes to file if we have a file path
      if (this.currentFilePath && window.electron) {
        window.electron.saveDatabase(this.currentFilePath, this.lastSavedData)
          .then(({ success, error }) => {
            if (success) {
              toast({
                title: "Success",
                description: "Changes saved to database file"
              });
            } else {
              toast({
                title: "Error",
                description: `Failed to save changes: ${error}`,
                variant: "destructive"
              });
            }
          })
          .catch(error => {
            console.error('Error saving database:', error);
            toast({
              title: "Error",
              description: "Failed to save changes to database file",
              variant: "destructive"
            });
          });
      }

      return true;
    } catch (error) {
      console.error('Error updating row:', error);
      return false;
    }
  }

  // Add method to get the current database state
  exportDatabase(): Uint8Array | null {
    if (!this.db) return null;
    const currentData = this.db.export();
    this.lastSavedData = currentData;
    return currentData;
  }

  // Add method to load database from last saved state
  loadLastSavedState(): boolean {
    if (!this.lastSavedData || !this.SQL) return false;
    
    try {
      if (this.db) {
        this.db.close();
      }
      this.db = new this.SQL.Database(this.lastSavedData);
      return true;
    } catch (error) {
      console.error('Error loading last saved state:', error);
      return false;
    }
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export a singleton instance
export const dbService = new DbService();

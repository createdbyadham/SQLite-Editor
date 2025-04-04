import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { dbService } from '@/lib/dbService';
import { pgService } from '@/lib/pgService';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, PlayCircle, Save, Trash, CheckCircle2, Info, Code2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BatchOperationsProps {
  isPostgres?: boolean;
}

const BatchOperations = ({ isPostgres = false }: BatchOperationsProps) => {
  const [sqlScript, setSqlScript] = useState('');
  const [useTransaction, setUseTransaction] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{ 
    success: boolean;
    affectedTables: string[];
    errors: string[];
    executionTime?: number;
  } | null>(null);
  const [savedScripts, setSavedScripts] = useState<{ name: string; sql: string }[]>([]);
  const [scriptName, setScriptName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to execute the SQL script
  const executeScript = async () => {
    if (!sqlScript.trim()) {
      toast({
        title: "Empty Script",
        description: "Please enter SQL statements to execute",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setResults(null);

    try {
      // Split script into statements by semicolons
      // This is a simple parser and may not handle all SQL syntax perfectly
      // Especially if semicolons occur in string literals or comments
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

      if (statements.length === 0) {
        toast({
          title: "Invalid Script",
          description: "No valid SQL statements found",
          variant: "destructive"
        });
        setIsRunning(false);
        return;
      }

      const startTime = performance.now();
      
      let result: { 
        success: boolean; 
        affectedTables: string[]; 
        errors: string[];
      };
      
      if (isPostgres) {
        // For PostgreSQL, execute each statement sequentially
        result = { success: true, affectedTables: [], errors: [] };
        
        for (const statement of statements) {
          try {
            const queryResult = await pgService.executeQuery(statement);
            if (queryResult) {
              // Try to extract table names from the SQL
              const tableMatches = statement.match(/(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|ALTER\s+TABLE|CREATE\s+TABLE|DROP\s+TABLE)\s+(?:"|')?(\w+)(?:"|')?/i);
              if (tableMatches && tableMatches[1] && !result.affectedTables.includes(tableMatches[1])) {
                result.affectedTables.push(tableMatches[1]);
              }
            } else {
              result.success = false;
              result.errors.push(`Failed to execute: ${statement}`);
            }
          } catch (error) {
            result.success = false;
            result.errors.push(error instanceof Error ? error.message : "Unknown error");
          }
        }
      } else {
        // For SQLite, use the existing batch operation
        result = dbService.executeBatchOperations(statements, useTransaction);
      }
      
      const endTime = performance.now();

      setResults({
        ...result,
        executionTime: Math.round(endTime - startTime)
      });

      if (result.success) {
        toast({
          title: "Success",
          description: `Executed ${statements.length} statement${statements.length > 1 ? 's' : ''} successfully`
        });
      } else {
        toast({
          title: "Execution Error",
          description: `${result.errors.length} error${result.errors.length > 1 ? 's' : ''} occurred`,
          variant: "destructive"
        });
      }
    } catch (error) {
      setResults({
        success: false,
        affectedTables: [],
        errors: [error instanceof Error ? error.message : "Unknown error occurred"]
      });
      
      toast({
        title: "Execution Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const saveScript = () => {
    if (!sqlScript.trim()) {
      toast({
        title: "Empty Script",
        description: "Cannot save an empty script",
        variant: "destructive"
      });
      return;
    }

    if (!scriptName.trim()) {
      toast({
        title: "Missing Name",
        description: "Please provide a name for your script",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicates
    if (savedScripts.some(script => script.name === scriptName)) {
      toast({
        title: "Duplicate Name",
        description: "A script with this name already exists",
        variant: "destructive"
      });
      return;
    }

    const newScript = { name: scriptName, sql: sqlScript };
    setSavedScripts([...savedScripts, newScript]);
    
    // Save to localStorage for persistence
    const existingScripts = JSON.parse(localStorage.getItem('savedScripts') || '[]');
    localStorage.setItem('savedScripts', JSON.stringify([...existingScripts, newScript]));
    
    setScriptName('');
    toast({
      title: "Script Saved",
      description: `"${scriptName}" has been saved to your collection`
    });
  };

  const loadScript = (script: { name: string; sql: string }) => {
    setSqlScript(script.sql);
    toast({
      title: "Script Loaded",
      description: `"${script.name}" is ready to edit or execute`
    });
  };

  const deleteScript = (scriptToDelete: { name: string; sql: string }) => {
    const updatedScripts = savedScripts.filter(script => script.name !== scriptToDelete.name);
    setSavedScripts(updatedScripts);
    
    // Update localStorage
    localStorage.setItem('savedScripts', JSON.stringify(updatedScripts));
    
    toast({
      title: "Script Deleted",
      description: `"${scriptToDelete.name}" has been removed from your collection`
    });
  };

  // Load saved scripts from localStorage when component mounts
  useEffect(() => {
    try {
      const storedScripts = localStorage.getItem('savedScripts');
      if (storedScripts) {
        setSavedScripts(JSON.parse(storedScripts));
      }
    } catch (error) {
      console.error("Error loading saved scripts:", error);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-220px)] flex flex-col animate-fade-in">
      <Tabs defaultValue="editor" className="flex-1 flex flex-col">
        <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center space-x-2">
              <Code2 className="h-5 w-5 text-primary/80" />
              <h1 className="text-xl font-semibold tracking-tight">SQL Editor</h1>
              {isPostgres && (
                <Badge variant="outline" className="ml-2">
                  PostgreSQL
                </Badge>
              )}
            </div>
          </div>
          <TabsList className="ml-4 mb-4">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="savedScripts">Saved Scripts</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="editor" className="data-[state=inactive]:hidden flex-1 flex flex-col p-4 pt-0">
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-4">
                {!isPostgres && (
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="transaction-mode" 
                      checked={useTransaction} 
                      onCheckedChange={setUseTransaction} 
                    />
                    <Label htmlFor="transaction-mode">
                      Use Transaction (All or Nothing)
                    </Label>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Script name"
                    className="flex h-10 w-[250px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                  />
                  <Button variant="outline" onClick={saveScript}>
                    <Save className="mr-2 h-4 w-4" />
                    Save Script
                  </Button>
                </div>
                <Button onClick={executeScript} disabled={isRunning}>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  {isRunning ? 'Running...' : 'Execute Script'}
                </Button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
              <Textarea
                ref={textareaRef}
                placeholder={isPostgres ? 
                  "Enter PostgreSQL statements (each statement must end with a semicolon)..." : 
                  "Enter SQL statements separated by semicolons (;)..."
                }
                className="flex-1 font-mono text-base min-h-[300px] resize-none rounded-md border bg-background shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={sqlScript}
                onChange={(e) => setSqlScript(e.target.value)}
              />
              
              {results && (
                <div className="mt-4 space-y-2">
                  <Alert variant={results.success ? "default" : "destructive"}>
                    <div className="flex items-center gap-2">
                      {results.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {results.success ? 'Script executed successfully' : 'Script execution failed'}
                      </AlertTitle>
                    </div>
                    <AlertDescription>
                      <div className="mt-2 space-y-2">
                        <p className="text-sm">Execution time: {results.executionTime}ms</p>
                        
                        {results.affectedTables.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Affected tables:</p>
                            <div className="flex flex-wrap gap-1">
                              {results.affectedTables.map(table => (
                                <Badge key={table} variant="outline">
                                  {table}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {results.errors.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Errors:</p>
                            <div className="space-y-1">
                              {results.errors.map((error, idx) => (
                                <div key={idx} className="text-sm p-2 bg-destructive/10 rounded-md">
                                  {error}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="savedScripts" className="flex-1 overflow-auto">
          <div className="p-4 pt-2">
            {savedScripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <div className="p-6 rounded-lg border-2 border-dashed text-center">
                  <Info className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-3 text-lg font-medium">No saved scripts</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm text-center text-sm">
                    Save your frequently used SQL scripts here for quick access
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {savedScripts.map((script) => (
                  <Card key={script.name} className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3">
                      <div>
                        <CardTitle className="text-sm font-medium">{script.name}</CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {script.sql.split('\n').length} line{script.sql.split('\n').length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deleteScript(script)} className="h-8 w-8 -mr-2">
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete script</span>
                      </Button>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <ScrollArea className="h-[100px] w-full rounded-md border bg-muted/40 p-2">
                        <pre className="text-xs font-mono text-muted-foreground">{script.sql}</pre>
                      </ScrollArea>
                    </CardContent>
                    <div className="p-3 pt-0">
                      <Button size="sm" onClick={() => loadScript(script)} className="w-full">
                        Load Script
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatchOperations; 
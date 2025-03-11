import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColumnInfo, RowData } from '@/lib/dbService';
import { toast } from '@/hooks/use-toast';

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: RowData;
  columns: string[];
  columnInfo: ColumnInfo[];
  onSave: (updatedRow: RowData) => void;
}

export function EditDialog({
  open,
  onOpenChange,
  row,
  columns,
  columnInfo,
  onSave,
}: EditDialogProps) {
  const [editedValues, setEditedValues] = useState<RowData>({ ...row });

  // Update editedValues when row changes
  useEffect(() => {
    setEditedValues({ ...row });
  }, [row]);

  const handleInputChange = (column: string, value: string) => {
    const columnDef = columnInfo.find(col => col.name === column);
    if (!columnDef) return;

    let finalValue: unknown = value;

    // Handle empty values
    if (value === '') {
      if (columnDef.notnull) {
        // For NOT NULL columns, prevent clearing
        toast({
          title: "Error",
          description: `${column} cannot be null`,
          variant: "destructive"
        });
        return;
      }
      finalValue = null;
    } else {
      // Type conversion based on column type
      try {
        if (columnDef.type.toLowerCase().includes('int')) {
          finalValue = parseInt(value, 10);
          if (isNaN(finalValue as number)) throw new Error('Invalid integer');
        } else if (columnDef.type.toLowerCase().includes('float') || columnDef.type.toLowerCase().includes('real')) {
          finalValue = parseFloat(value);
          if (isNaN(finalValue as number)) throw new Error('Invalid number');
        } else if (columnDef.type.toLowerCase() === 'boolean') {
          finalValue = value.toLowerCase() === 'true';
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `Invalid value for ${column}`,
          variant: "destructive"
        });
        return;
      }
    }

    setEditedValues(prev => ({
      ...prev,
      [column]: finalValue
    }));
  };

  const handleSave = () => {
    // Validate required fields
    const missingRequired = columnInfo
      .filter(col => col.notnull)
      .find(col => editedValues[col.name] === null || editedValues[col.name] === undefined);

    if (missingRequired) {
      toast({
        title: "Error",
        description: `${missingRequired.name} is required`,
        variant: "destructive"
      });
      return;
    }

    onSave(editedValues);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Row</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {columns.map((column) => {
            const info = columnInfo.find(col => col.name === column);
            const isPK = info?.pk === 1;
            return (
              <div key={column} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={column} className="text-right">
                  {column}
                  {info?.notnull && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id={column}
                  value={editedValues[column] === null ? '' : String(editedValues[column])}
                  onChange={(e) => handleInputChange(column, e.target.value)}
                  className="col-span-3"
                  disabled={isPK}
                  placeholder={info?.type || 'text'}
                />
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
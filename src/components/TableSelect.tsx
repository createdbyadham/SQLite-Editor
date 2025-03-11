import { Button } from '@/components/ui/button';
import { TableInfo } from '@/lib/dbService';

interface TableSelectProps {
  tables: TableInfo[];
  selectedTable: string;
  onSelectTable: (tableName: string) => void;
}

const TableSelect = ({ tables, selectedTable, onSelectTable }: TableSelectProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {tables.map((table) => (
        <Button
          key={table.name}
          variant={selectedTable === table.name ? "default" : "outline"}
          onClick={() => onSelectTable(table.name)}
        >
          {table.name}
        </Button>
      ))}
    </div>
  );
};

export default TableSelect; 
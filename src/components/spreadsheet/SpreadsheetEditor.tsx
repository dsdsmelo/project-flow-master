import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DataSheetGrid,
  textColumn,
  keyColumn,
  Column,
  DataSheetGridRef,
  CellProps,
} from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Download,
  Loader2,
  Save,
  Copy,
  GripVertical,
  MoreHorizontal,
  ArrowUpDown,
  Palette,
  Check,
  Cloud,
  CloudOff,
  Type,
  Hash,
  Calendar,
  Percent,
  DollarSign,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useData } from '@/contexts/DataContext';
import { Spreadsheet, SpreadsheetColumn, SpreadsheetRow, SpreadsheetCell } from '@/lib/types';

interface SpreadsheetEditorProps {
  spreadsheet: Spreadsheet;
}

// Internal row type for the grid
interface GridRow {
  id: string;
  cells: Record<string, string>;
  styles?: Record<string, CellStyle>;
}

interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
}

// Color palette for cells
const CELL_COLORS = [
  { name: 'Nenhum', value: '' },
  { name: 'Vermelho claro', value: '#fee2e2' },
  { name: 'Laranja claro', value: '#ffedd5' },
  { name: 'Amarelo claro', value: '#fef9c3' },
  { name: 'Verde claro', value: '#dcfce7' },
  { name: 'Azul claro', value: '#dbeafe' },
  { name: 'Roxo claro', value: '#f3e8ff' },
  { name: 'Rosa claro', value: '#fce7f3' },
  { name: 'Cinza claro', value: '#f3f4f6' },
];

const TEXT_COLORS = [
  { name: 'Padrão', value: '' },
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Laranja', value: '#ea580c' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Roxo', value: '#9333ea' },
  { name: 'Cinza', value: '#6b7280' },
];

// Formula parser (simple implementation)
const parseFormula = (formula: string, rows: GridRow[], columns: SpreadsheetColumn[]): string => {
  if (!formula.startsWith('=')) return formula;

  const formulaUpper = formula.toUpperCase();

  // SUM function
  const sumMatch = formulaUpper.match(/=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (sumMatch) {
    const [, startCol, startRowStr, , endRowStr] = sumMatch;
    const startColIndex = startCol.charCodeAt(0) - 65;
    const startRow = parseInt(startRowStr) - 1;
    const endRow = parseInt(endRowStr) - 1;

    let sum = 0;
    for (let i = startRow; i <= endRow && i < rows.length; i++) {
      const colId = columns[startColIndex]?.id;
      if (colId) {
        const value = parseFloat(rows[i].cells[colId] || '0');
        if (!isNaN(value)) sum += value;
      }
    }
    return sum.toString();
  }

  // COUNT function
  const countMatch = formulaUpper.match(/=COUNT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (countMatch) {
    const [, startCol, startRowStr, , endRowStr] = countMatch;
    const startColIndex = startCol.charCodeAt(0) - 65;
    const startRow = parseInt(startRowStr) - 1;
    const endRow = parseInt(endRowStr) - 1;

    let count = 0;
    for (let i = startRow; i <= endRow && i < rows.length; i++) {
      const colId = columns[startColIndex]?.id;
      if (colId && rows[i].cells[colId]) {
        count++;
      }
    }
    return count.toString();
  }

  // AVG function
  const avgMatch = formulaUpper.match(/=AVG\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (avgMatch) {
    const [, startCol, startRowStr, , endRowStr] = avgMatch;
    const startColIndex = startCol.charCodeAt(0) - 65;
    const startRow = parseInt(startRowStr) - 1;
    const endRow = parseInt(endRowStr) - 1;

    let sum = 0;
    let count = 0;
    for (let i = startRow; i <= endRow && i < rows.length; i++) {
      const colId = columns[startColIndex]?.id;
      if (colId) {
        const value = parseFloat(rows[i].cells[colId] || '');
        if (!isNaN(value)) {
          sum += value;
          count++;
        }
      }
    }
    return count > 0 ? (sum / count).toFixed(2) : '0';
  }

  // MIN function
  const minMatch = formulaUpper.match(/=MIN\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (minMatch) {
    const [, startCol, startRowStr, , endRowStr] = minMatch;
    const startColIndex = startCol.charCodeAt(0) - 65;
    const startRow = parseInt(startRowStr) - 1;
    const endRow = parseInt(endRowStr) - 1;

    let min = Infinity;
    for (let i = startRow; i <= endRow && i < rows.length; i++) {
      const colId = columns[startColIndex]?.id;
      if (colId) {
        const value = parseFloat(rows[i].cells[colId] || '');
        if (!isNaN(value) && value < min) min = value;
      }
    }
    return min === Infinity ? '0' : min.toString();
  }

  // MAX function
  const maxMatch = formulaUpper.match(/=MAX\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (maxMatch) {
    const [, startCol, startRowStr, , endRowStr] = maxMatch;
    const startColIndex = startCol.charCodeAt(0) - 65;
    const startRow = parseInt(startRowStr) - 1;
    const endRow = parseInt(endRowStr) - 1;

    let max = -Infinity;
    for (let i = startRow; i <= endRow && i < rows.length; i++) {
      const colId = columns[startColIndex]?.id;
      if (colId) {
        const value = parseFloat(rows[i].cells[colId] || '');
        if (!isNaN(value) && value > max) max = value;
      }
    }
    return max === -Infinity ? '0' : max.toString();
  }

  return formula;
};

// Column Header component with inline editing
function ColumnHeader({
  column,
  columnIndex,
  onRename,
  onSort,
  onDelete,
  onChangeType,
  canDelete
}: {
  column: SpreadsheetColumn;
  columnIndex: number;
  onRename: (newName: string) => void;
  onSort: (direction: 'asc' | 'desc') => void;
  onDelete: () => void;
  onChangeType: (type: string) => void;
  canDelete: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(column.name);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== column.name) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(column.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getTypeIcon = () => {
    switch (column.type) {
      case 'number': return <Hash className="h-3 w-3" />;
      case 'date': return <Calendar className="h-3 w-3" />;
      case 'currency': return <DollarSign className="h-3 w-3" />;
      case 'percentage': return <Percent className="h-3 w-3" />;
      default: return <Type className="h-3 w-3" />;
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="flex-1 px-1 py-0.5 text-xs font-medium bg-background border border-primary rounded outline-none min-w-0"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full group">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-muted-foreground">{getTypeIcon()}</span>
        <span
          className="font-medium text-xs cursor-text truncate"
          onDoubleClick={handleDoubleClick}
          title="Clique duas vezes para editar"
        >
          {column.name}
        </span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/80 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={() => { setEditValue(column.name); setIsEditing(true); }}>
            Renomear
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Type className="h-4 w-4 mr-2" />
              Tipo de coluna
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onChangeType('text')}>
                <Type className="h-4 w-4 mr-2" />
                Texto
                {column.type === 'text' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType('number')}>
                <Hash className="h-4 w-4 mr-2" />
                Número
                {column.type === 'number' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType('date')}>
                <Calendar className="h-4 w-4 mr-2" />
                Data
                {column.type === 'date' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType('currency')}>
                <DollarSign className="h-4 w-4 mr-2" />
                Moeda
                {column.type === 'currency' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType('percentage')}>
                <Percent className="h-4 w-4 mr-2" />
                Percentual
                {column.type === 'percentage' && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSort('asc')}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Ordenar A-Z
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSort('desc')}>
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Ordenar Z-A
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir coluna
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SpreadsheetEditor({ spreadsheet }: SpreadsheetEditorProps) {
  const { fetchSpreadsheetData, saveSpreadsheetData } = useData();

  const gridRef = useRef<DataSheetGridRef>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for spreadsheet data
  const [columns, setColumns] = useState<SpreadsheetColumn[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);

  // Selected cell for formula bar
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: string } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState('');

  // Track row hover for actions
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);

  // Track data version for auto-save
  const [dataVersion, setDataVersion] = useState(0);
  const debouncedVersion = useDebounce(dataVersion, 2000); // 2 second debounce

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchSpreadsheetData(spreadsheet.id);

        // If no columns exist, create default ones
        if (data.columns.length === 0) {
          const defaultColumns: SpreadsheetColumn[] = [
            { id: crypto.randomUUID(), spreadsheetId: spreadsheet.id, name: 'Coluna A', type: 'text', width: 150, orderIndex: 0, createdAt: new Date().toISOString() },
            { id: crypto.randomUUID(), spreadsheetId: spreadsheet.id, name: 'Coluna B', type: 'text', width: 150, orderIndex: 1, createdAt: new Date().toISOString() },
            { id: crypto.randomUUID(), spreadsheetId: spreadsheet.id, name: 'Coluna C', type: 'text', width: 150, orderIndex: 2, createdAt: new Date().toISOString() },
          ];
          setColumns(defaultColumns);

          // Create default rows
          const defaultRows: GridRow[] = Array.from({ length: 10 }, () => ({
            id: crypto.randomUUID(),
            cells: {},
            styles: {},
          }));
          setRows(defaultRows);
          setHasChanges(true);
        } else {
          setColumns(data.columns);

          // Convert DB rows and cells to grid format
          const gridRows: GridRow[] = data.rows.map(row => {
            const cells: Record<string, string> = {};
            data.cells.filter(c => c.rowId === row.id).forEach(cell => {
              cells[cell.columnId] = cell.value || '';
            });
            return { id: row.id, cells, styles: {} };
          });

          // If no rows, create some defaults
          if (gridRows.length === 0) {
            const defaultRows: GridRow[] = Array.from({ length: 10 }, () => ({
              id: crypto.randomUUID(),
              cells: {},
              styles: {},
            }));
            setRows(defaultRows);
            setHasChanges(true);
          } else {
            setRows(gridRows);
          }
        }
      } catch (error: any) {
        console.error('Error loading spreadsheet data:', error);
        toast.error('Erro ao carregar dados da tabela');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [spreadsheet.id, fetchSpreadsheetData]);

  // Auto-save when debounced version changes
  useEffect(() => {
    if (debouncedVersion > 0 && hasChanges && !loading) {
      performSave();
    }
  }, [debouncedVersion]);

  // Save data to Supabase
  const performSave = useCallback(async () => {
    if (saving) return;

    setSaving(true);
    setSaveError(false);
    try {
      // Convert columns to DB format
      const dbColumns: SpreadsheetColumn[] = columns.map((col, index) => ({
        ...col,
        spreadsheetId: spreadsheet.id,
        orderIndex: index,
      }));

      // Convert rows to DB format
      const dbRows: SpreadsheetRow[] = rows.map((row, index) => ({
        id: row.id,
        spreadsheetId: spreadsheet.id,
        orderIndex: index,
        createdAt: new Date().toISOString(),
      }));

      // Convert cells to DB format
      const cells: SpreadsheetCell[] = [];
      rows.forEach(row => {
        Object.entries(row.cells).forEach(([colId, value]) => {
          if (value) {
            cells.push({
              id: crypto.randomUUID(),
              rowId: row.id,
              columnId: colId,
              value: value,
            });
          }
        });
      });

      await saveSpreadsheetData(spreadsheet.id, dbColumns, dbRows, cells);
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (error: any) {
      console.error('Error saving spreadsheet:', error);
      setSaveError(true);
      toast.error('Erro ao salvar. Clique em "Salvar" para tentar novamente.');
    } finally {
      setSaving(false);
    }
  }, [columns, rows, spreadsheet.id, saveSpreadsheetData, saving]);

  // Manual save
  const handleManualSave = useCallback(async () => {
    await performSave();
    if (!saveError) {
      toast.success('Tabela salva com sucesso!');
    }
  }, [performSave, saveError]);

  // Mark as changed and trigger auto-save
  const markChanged = useCallback(() => {
    setHasChanges(true);
    setDataVersion(v => v + 1);
  }, []);

  // Convert data to grid format
  const gridData = useMemo(() => {
    return rows.map(row => {
      const rowData: Record<string, string> = { _id: row.id };
      columns.forEach(col => {
        let value = row.cells[col.id] || '';
        // Parse formulas
        if (value.startsWith('=')) {
          value = parseFormula(value, rows, columns);
        }
        rowData[col.id] = value;
      });
      return rowData;
    });
  }, [rows, columns]);

  // Handle data changes
  const handleChange = useCallback((newData: Record<string, string>[]) => {
    const newRows = newData.map((row, index) => ({
      id: row._id,
      cells: Object.fromEntries(
        Object.entries(row).filter(([key]) => key !== '_id')
      ),
      styles: rows[index]?.styles || {},
    }));
    setRows(newRows);
    markChanged();
  }, [markChanged, rows]);

  // Handle cell selection
  const handleActiveChange = useCallback((cell: { col: number; row: number } | null) => {
    if (cell && cell.row >= 0 && cell.col >= 0) {
      const colId = columns[cell.col]?.id;
      if (colId) {
        setSelectedCell({ row: cell.row, col: colId });
        const rawValue = rows[cell.row]?.cells[colId] || '';
        setFormulaBarValue(rawValue);
      }
    } else {
      setSelectedCell(null);
      setFormulaBarValue('');
    }
  }, [columns, rows]);

  // Handle formula bar change
  const handleFormulaBarChange = useCallback((value: string) => {
    setFormulaBarValue(value);
    if (selectedCell) {
      setRows(prev => prev.map((row, idx) => {
        if (idx === selectedCell.row) {
          return {
            ...row,
            cells: { ...row.cells, [selectedCell.col]: value }
          };
        }
        return row;
      }));
      markChanged();
    }
  }, [selectedCell, markChanged]);

  // Add row
  const handleAddRow = useCallback(() => {
    const newRow: GridRow = {
      id: crypto.randomUUID(),
      cells: {},
      styles: {},
    };
    setRows(prev => [...prev, newRow]);
    markChanged();
  }, [markChanged]);

  // Delete row
  const handleDeleteRow = useCallback((rowIndex: number) => {
    if (rows.length <= 1) {
      toast.error('A tabela precisa ter pelo menos uma linha');
      return;
    }
    setRows(prev => prev.filter((_, idx) => idx !== rowIndex));
    markChanged();
  }, [rows.length, markChanged]);

  // Duplicate row
  const handleDuplicateRow = useCallback((rowIndex: number) => {
    const rowToDuplicate = rows[rowIndex];
    const newRow: GridRow = {
      id: crypto.randomUUID(),
      cells: { ...rowToDuplicate.cells },
      styles: { ...rowToDuplicate.styles },
    };
    setRows(prev => {
      const newRows = [...prev];
      newRows.splice(rowIndex + 1, 0, newRow);
      return newRows;
    });
    markChanged();
  }, [rows, markChanged]);

  // Insert row at position
  const handleInsertRowAt = useCallback((rowIndex: number, position: 'above' | 'below') => {
    const newRow: GridRow = {
      id: crypto.randomUUID(),
      cells: {},
      styles: {},
    };
    setRows(prev => {
      const newRows = [...prev];
      const insertIndex = position === 'above' ? rowIndex : rowIndex + 1;
      newRows.splice(insertIndex, 0, newRow);
      return newRows;
    });
    markChanged();
  }, [markChanged]);

  // Add column
  const handleAddColumn = useCallback(() => {
    const newColLetter = String.fromCharCode(65 + columns.length); // A, B, C, etc.
    const newCol: SpreadsheetColumn = {
      id: crypto.randomUUID(),
      spreadsheetId: spreadsheet.id,
      name: `Coluna ${newColLetter}`,
      type: 'text',
      width: 150,
      orderIndex: columns.length,
      createdAt: new Date().toISOString(),
    };
    setColumns(prev => [...prev, newCol]);
    markChanged();
  }, [columns.length, spreadsheet.id, markChanged]);

  // Rename column
  const handleRenameColumn = useCallback((colId: string, newName: string) => {
    setColumns(prev => prev.map(col =>
      col.id === colId ? { ...col, name: newName } : col
    ));
    markChanged();
  }, [markChanged]);

  // Change column type
  const handleChangeColumnType = useCallback((colId: string, newType: string) => {
    setColumns(prev => prev.map(col =>
      col.id === colId ? { ...col, type: newType } : col
    ));
    markChanged();
  }, [markChanged]);

  // Delete column
  const handleDeleteColumn = useCallback((colId: string) => {
    if (columns.length <= 1) {
      toast.error('A tabela precisa ter pelo menos uma coluna');
      return;
    }

    setColumns(prev => prev.filter(c => c.id !== colId));
    setRows(prev => prev.map(row => ({
      ...row,
      cells: Object.fromEntries(
        Object.entries(row.cells).filter(([key]) => key !== colId)
      ),
    })));
    markChanged();
  }, [columns.length, markChanged]);

  // Sort column
  const handleSortColumn = useCallback((colId: string, direction: 'asc' | 'desc') => {
    setRows(prev => {
      const sortedRows = [...prev].sort((a, b) => {
        const aVal = a.cells[colId] || '';
        const bVal = b.cells[colId] || '';
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);

        // Numeric comparison if both are numbers
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // String comparison
        return direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
      return sortedRows;
    });
    markChanged();
  }, [markChanged]);

  // Set cell background color
  const handleSetCellColor = useCallback((rowIndex: number, colId: string, color: string) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx === rowIndex) {
        return {
          ...row,
          styles: {
            ...row.styles,
            [colId]: { ...(row.styles?.[colId] || {}), backgroundColor: color }
          }
        };
      }
      return row;
    }));
    markChanged();
  }, [markChanged]);

  // Build columns for DataSheetGrid
  const gridColumns: Column<Record<string, string>>[] = useMemo(() => {
    return columns.map((col, index) => ({
      ...keyColumn(col.id, textColumn),
      title: (
        <ColumnHeader
          column={col}
          columnIndex={index}
          onRename={(newName) => handleRenameColumn(col.id, newName)}
          onSort={(direction) => handleSortColumn(col.id, direction)}
          onDelete={() => handleDeleteColumn(col.id)}
          onChangeType={(type) => handleChangeColumnType(col.id, type)}
          canDelete={columns.length > 1}
        />
      ),
      minWidth: col.width,
    }));
  }, [columns, handleRenameColumn, handleSortColumn, handleDeleteColumn, handleChangeColumnType]);

  // Export to Excel
  const handleExport = () => {
    const wsData = [
      columns.map(c => c.name),
      ...rows.map(row => columns.map(col => row.cells[col.id] || '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spreadsheet.name);
    XLSX.writeFile(wb, `${spreadsheet.name}.xlsx`);
    toast.success('Tabela exportada!');
  };

  // Get selected cell label
  const getSelectedCellLabel = () => {
    if (!selectedCell) return '';
    const colIndex = columns.findIndex(c => c.id === selectedCell.col);
    if (colIndex === -1) return '';
    const colLetter = String.fromCharCode(65 + colIndex);
    return `${colLetter}${selectedCell.row + 1}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Formula Bar */}
      <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg">
        <div className="flex items-center gap-2 min-w-[60px]">
          <span className="text-xs font-mono font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
            {getSelectedCellLabel() || 'A1'}
          </span>
        </div>
        <div className="h-6 w-px bg-border" />
        <Input
          value={formulaBarValue}
          onChange={(e) => handleFormulaBarChange(e.target.value)}
          placeholder="Clique em uma célula para editar ou digite uma fórmula (ex: =SUM(A1:A10))"
          className="flex-1 h-8 text-sm font-mono"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap bg-muted/30 p-2 rounded-lg">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="h-4 w-4 mr-1" />
          Linha
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddColumn}>
          <Plus className="h-4 w-4 mr-1" />
          Coluna
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Color picker for selected cell */}
        {selectedCell && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Palette className="h-4 w-4 mr-1" />
                Cor
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Cor de fundo</p>
                <div className="grid grid-cols-3 gap-1">
                  {CELL_COLORS.map(color => (
                    <button
                      key={color.value || 'none'}
                      className={cn(
                        "h-6 rounded border border-border hover:border-primary transition-colors",
                        !color.value && "bg-white dark:bg-gray-900"
                      )}
                      style={{ backgroundColor: color.value || undefined }}
                      onClick={() => handleSetCellColor(selectedCell.row, selectedCell.col, color.value)}
                      title={color.name}
                    >
                      {!color.value && <span className="text-xs text-muted-foreground">✕</span>}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="h-6 w-px bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Exportar
        </Button>

        <div className="flex-1" />

        {/* Save status indicator */}
        <div className="flex items-center gap-2">
          {saving ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Salvando...</span>
            </div>
          ) : saveError ? (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <CloudOff className="h-3.5 w-3.5" />
              <span>Erro ao salvar</span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Cloud className="h-3.5 w-3.5" />
              <span>Salvo</span>
            </div>
          ) : hasChanges ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Cloud className="h-3.5 w-3.5" />
              <span>Alterações pendentes</span>
            </div>
          ) : null}

          {/* Manual save button - shows when there's error or changes */}
          {(saveError || hasChanges) && (
            <Button
              size="sm"
              onClick={handleManualSave}
              disabled={saving}
              variant={saveError ? "destructive" : "default"}
              className={cn(!saveError && "bg-emerald-600 hover:bg-emerald-700 text-white")}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden bg-card spreadsheet-editor">
        <div className="flex">
          {/* Row numbers column */}
          <div className="flex-shrink-0 border-r border-border bg-muted/50">
            {/* Header cell */}
            <div
              className="h-[36px] flex items-center justify-center border-b border-border text-xs font-medium text-muted-foreground"
              style={{ width: 40 }}
            >
              #
            </div>
            {/* Row number cells */}
            {rows.map((row, rowIndex) => (
              <div
                key={row.id}
                className="flex items-center justify-center border-b border-border/50 group/rownum"
                style={{ height: 32, width: 40 }}
                onMouseEnter={() => setHoveredRowIndex(rowIndex)}
                onMouseLeave={() => setHoveredRowIndex(null)}
              >
                {hoveredRowIndex === rowIndex ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <GripVertical className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="right">
                      <DropdownMenuItem onClick={() => handleInsertRowAt(rowIndex, 'above')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Inserir acima
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleInsertRowAt(rowIndex, 'below')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Inserir abaixo
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDuplicateRow(rowIndex)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="text-destructive"
                        disabled={rows.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <span className="text-xs text-muted-foreground">{rowIndex + 1}</span>
                )}
              </div>
            ))}
            {/* Add row button */}
            <div
              className="h-8 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50"
              style={{ width: 40 }}
              onClick={handleAddRow}
              title="Adicionar linha"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>

          {/* Main grid */}
          <div className="flex-1 overflow-auto">
            <DataSheetGrid
              ref={gridRef}
              value={gridData}
              onChange={handleChange}
              columns={gridColumns}
              height={Math.min(500, (rows.length + 2) * 32 + 36)}
              rowHeight={32}
              headerRowHeight={36}
              addRowsComponent={false}
              className="text-sm"
              lockRows={false}
              onActiveCellChange={handleActiveChange}
            />
          </div>
        </div>
      </div>

      {/* Info footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{rows.length} {rows.length === 1 ? 'linha' : 'linhas'} × {columns.length} {columns.length === 1 ? 'coluna' : 'colunas'}</span>
        <div className="flex items-center gap-4">
          <span>Fórmulas: =SUM(), =AVG(), =COUNT(), =MIN(), =MAX()</span>
          <span>Clique duas vezes no nome da coluna para editar</span>
        </div>
      </div>
    </div>
  );
}

export default SpreadsheetEditor;

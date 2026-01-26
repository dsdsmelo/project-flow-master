import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  DataSheetGrid,
  textColumn,
  keyColumn,
  Column,
  DataSheetGridRef,
} from 'react-datasheet-grid';
import 'react-datasheet-grid/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Download,
  Calculator,
  Columns,
  Rows,
  Palette,
  Settings,
  ChevronDown,
  ArrowUpDown,
  Loader2,
  Save,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { useData } from '@/contexts/DataContext';
import { Spreadsheet, SpreadsheetColumn, SpreadsheetRow, SpreadsheetCell } from '@/lib/types';
import { ConditionalFormat } from '@/lib/spreadsheet-types';

interface SpreadsheetEditorProps {
  spreadsheet: Spreadsheet;
}

// Internal row type for the grid
interface GridRow {
  id: string;
  cells: Record<string, string>;
}

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

// Conditional formatting check
const checkConditionalFormat = (
  value: string,
  formats?: ConditionalFormat[]
): { backgroundColor?: string; textColor?: string; bold?: boolean } | null => {
  if (!formats || formats.length === 0) return null;

  const numValue = parseFloat(value);

  for (const format of formats) {
    let matches = false;

    switch (format.condition) {
      case 'greaterThan':
        matches = !isNaN(numValue) && numValue > Number(format.value);
        break;
      case 'lessThan':
        matches = !isNaN(numValue) && numValue < Number(format.value);
        break;
      case 'equals':
        matches = value === String(format.value) || numValue === Number(format.value);
        break;
      case 'between':
        matches = !isNaN(numValue) && numValue >= Number(format.value) && numValue <= Number(format.value2);
        break;
      case 'contains':
        matches = value.toLowerCase().includes(String(format.value).toLowerCase());
        break;
      case 'isEmpty':
        matches = !value || value.trim() === '';
        break;
    }

    if (matches) {
      return {
        backgroundColor: format.backgroundColor,
        textColor: format.textColor,
        bold: format.bold,
      };
    }
  }

  return null;
};

export function SpreadsheetEditor({ spreadsheet }: SpreadsheetEditorProps) {
  const { fetchSpreadsheetData, saveSpreadsheetData } = useData();

  const gridRef = useRef<DataSheetGridRef>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Local state for spreadsheet data
  const [columns, setColumns] = useState<SpreadsheetColumn[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [dbCells, setDbCells] = useState<SpreadsheetCell[]>([]);

  const [formulaInput, setFormulaInput] = useState('');
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<SpreadsheetColumn | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<SpreadsheetColumn['type']>('text');
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [formatColumn, setFormatColumn] = useState<SpreadsheetColumn | null>(null);
  const [formatCondition, setFormatCondition] = useState<ConditionalFormat['condition']>('greaterThan');
  const [formatValue, setFormatValue] = useState('');
  const [formatValue2, setFormatValue2] = useState('');
  const [formatBgColor, setFormatBgColor] = useState('#fef2f2');
  const [formatTextColor, setFormatTextColor] = useState('#991b1b');

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
          const defaultRows: GridRow[] = Array.from({ length: 5 }, (_, i) => ({
            id: crypto.randomUUID(),
            cells: {},
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
            return { id: row.id, cells };
          });

          // If no rows, create some defaults
          if (gridRows.length === 0) {
            const defaultRows: GridRow[] = Array.from({ length: 5 }, () => ({
              id: crypto.randomUUID(),
              cells: {},
            }));
            setRows(defaultRows);
            setHasChanges(true);
          } else {
            setRows(gridRows);
          }

          setDbCells(data.cells);
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

  // Save data to Supabase
  const handleSave = async () => {
    setSaving(true);
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
      toast.success('Tabela salva!');
    } catch (error: any) {
      console.error('Error saving spreadsheet:', error);
      toast.error(error.message || 'Erro ao salvar tabela');
    } finally {
      setSaving(false);
    }
  };

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

  // Build columns for DataSheetGrid
  const gridColumns: Column<Record<string, string>>[] = useMemo(() => {
    return columns.map((col, index) => ({
      ...keyColumn(col.id, textColumn),
      title: (
        <div className="flex items-center gap-1 group">
          <span>{col.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted">
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => handleEditColumn(col)}>
                <Settings className="h-4 w-4 mr-2" />
                Editar coluna
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortColumn(index, 'asc')}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Ordenar A-Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSortColumn(index, 'desc')}>
                <ArrowUpDown className="h-4 w-4 mr-2" />
                Ordenar Z-A
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => openFormatModal(col)}>
                <Palette className="h-4 w-4 mr-2" />
                Formatacao condicional
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteColumn(col.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir coluna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
      minWidth: col.width,
      cellClassName: ({ rowData }) => {
        const value = rowData[col.id] || '';
        const format = checkConditionalFormat(value, col.format);
        if (format) {
          return cn(format.bold && 'font-bold');
        }
        return '';
      },
    }));
  }, [columns]);

  // Handle data changes
  const handleChange = useCallback((newData: Record<string, string>[]) => {
    const newRows = newData.map(row => ({
      id: row._id,
      cells: Object.fromEntries(
        Object.entries(row).filter(([key]) => key !== '_id')
      ),
    }));
    setRows(newRows);
    setHasChanges(true);
  }, []);

  // Add row
  const handleAddRow = () => {
    const newRow: GridRow = {
      id: crypto.randomUUID(),
      cells: {},
    };
    setRows(prev => [...prev, newRow]);
    setHasChanges(true);
  };

  // Add column
  const handleAddColumn = () => {
    setEditingColumn(null);
    setNewColumnName('');
    setNewColumnType('text');
    setColumnModalOpen(true);
  };

  const handleEditColumn = (col: SpreadsheetColumn) => {
    setEditingColumn(col);
    setNewColumnName(col.name);
    setNewColumnType(col.type);
    setColumnModalOpen(true);
  };

  const handleSaveColumn = () => {
    if (!newColumnName.trim()) {
      toast.error('Nome da coluna e obrigatorio');
      return;
    }

    if (editingColumn) {
      // Update existing column
      setColumns(prev => prev.map(col =>
        col.id === editingColumn.id
          ? { ...col, name: newColumnName.trim(), type: newColumnType }
          : col
      ));
      toast.success('Coluna atualizada!');
    } else {
      // Add new column
      const newCol: SpreadsheetColumn = {
        id: crypto.randomUUID(),
        spreadsheetId: spreadsheet.id,
        name: newColumnName.trim(),
        type: newColumnType,
        width: 150,
        orderIndex: columns.length,
        createdAt: new Date().toISOString(),
      };
      setColumns(prev => [...prev, newCol]);
      toast.success('Coluna adicionada!');
    }

    setHasChanges(true);
    setColumnModalOpen(false);
  };

  const handleDeleteColumn = (colId: string) => {
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
    setHasChanges(true);
    toast.success('Coluna excluida!');
  };

  // Sort column
  const handleSortColumn = (colIndex: number, direction: 'asc' | 'desc') => {
    const colId = columns[colIndex].id;
    const sortedRows = [...rows].sort((a, b) => {
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

    setRows(sortedRows);
    setHasChanges(true);
  };

  // Conditional formatting
  const openFormatModal = (col: SpreadsheetColumn) => {
    setFormatColumn(col);
    setFormatCondition('greaterThan');
    setFormatValue('');
    setFormatValue2('');
    setFormatBgColor('#fef2f2');
    setFormatTextColor('#991b1b');
    setFormatModalOpen(true);
  };

  const handleSaveFormat = () => {
    if (!formatColumn) return;
    if (!formatValue && formatCondition !== 'isEmpty') {
      toast.error('Valor e obrigatorio');
      return;
    }

    const newFormat: ConditionalFormat = {
      condition: formatCondition,
      value: formatValue,
      value2: formatValue2 || undefined,
      backgroundColor: formatBgColor,
      textColor: formatTextColor,
    };

    setColumns(prev => prev.map(col =>
      col.id === formatColumn.id
        ? { ...col, format: [...(col.format || []), newFormat] }
        : col
    ));

    setHasChanges(true);
    toast.success('Formatacao adicionada!');
    setFormatModalOpen(false);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Rows className="h-4 w-4 mr-2" />
          Linha
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddColumn}>
          <Columns className="h-4 w-4 mr-2" />
          Coluna
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Calculator className="h-4 w-4 mr-2" />
              Formulas
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFormulaInput('=SUM(A1:A10)')}>
              =SUM(A1:A10) - Soma
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormulaInput('=COUNT(A1:A10)')}>
              =COUNT(A1:A10) - Contagem
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormulaInput('=AVG(A1:A10)')}>
              =AVG(A1:A10) - Media
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormulaInput('=MIN(A1:A10)')}>
              =MIN(A1:A10) - Minimo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormulaInput('=MAX(A1:A10)')}>
              =MAX(A1:A10) - Maximo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>

        <div className="flex-1" />

        {hasChanges && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar
          </Button>
        )}
      </div>

      {/* Formula bar */}
      {formulaInput && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">fx</span>
          <Input
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            className="flex-1 h-8"
            placeholder="Digite uma formula..."
          />
          <Button size="sm" variant="ghost" onClick={() => setFormulaInput('')}>
            Fechar
          </Button>
        </div>
      )}

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
        <DataSheetGrid
          ref={gridRef}
          value={gridData}
          onChange={handleChange}
          columns={gridColumns}
          height={500}
          rowHeight={32}
          headerRowHeight={36}
          addRowsComponent={false}
          className="text-sm"
        />
      </div>

      {/* Column Modal */}
      <Dialog open={columnModalOpen} onOpenChange={setColumnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Editar Coluna' : 'Nova Coluna'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Nome da coluna"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newColumnType} onValueChange={(v: any) => setNewColumnType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Numero</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="currency">Moeda (R$)</SelectItem>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setColumnModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveColumn}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conditional Format Modal */}
      <Dialog open={formatModalOpen} onOpenChange={setFormatModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Formatacao Condicional</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Condicao</Label>
              <Select value={formatCondition} onValueChange={(v: any) => setFormatCondition(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greaterThan">Maior que</SelectItem>
                  <SelectItem value="lessThan">Menor que</SelectItem>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="between">Entre</SelectItem>
                  <SelectItem value="contains">Contem</SelectItem>
                  <SelectItem value="isEmpty">Esta vazio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formatCondition !== 'isEmpty' && (
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  value={formatValue}
                  onChange={(e) => setFormatValue(e.target.value)}
                  placeholder="Valor de comparacao"
                />
              </div>
            )}

            {formatCondition === 'between' && (
              <div className="space-y-2">
                <Label>Valor 2</Label>
                <Input
                  value={formatValue2}
                  onChange={(e) => setFormatValue2(e.target.value)}
                  placeholder="Segundo valor"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor de fundo</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formatBgColor}
                    onChange={(e) => setFormatBgColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{formatBgColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor do texto</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formatTextColor}
                    onChange={(e) => setFormatTextColor(e.target.value)}
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground">{formatTextColor}</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg border">
              <Label className="text-xs text-muted-foreground">Previa</Label>
              <div
                className="mt-2 p-2 rounded text-sm"
                style={{
                  backgroundColor: formatBgColor,
                  color: formatTextColor,
                }}
              >
                Exemplo de celula formatada
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormatModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveFormat}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SpreadsheetEditor;

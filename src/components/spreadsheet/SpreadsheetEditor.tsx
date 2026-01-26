import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DataSheetGrid,
  textColumn,
  keyColumn,
  Column,
  CellProps,
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
  Bold,
  ArrowUpDown,
  Filter,
  Merge,
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

// Types
interface SpreadsheetColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'formula';
  width: number;
  format?: ConditionalFormat[];
}

interface ConditionalFormat {
  condition: 'greaterThan' | 'lessThan' | 'equals' | 'between' | 'contains' | 'isEmpty';
  value: string | number;
  value2?: string | number;
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
}

interface SpreadsheetRow {
  id: string;
  cells: Record<string, string>;
}

interface LocalSpreadsheet {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  data: {
    columns: SpreadsheetColumn[];
    rows: SpreadsheetRow[];
  };
}

interface SpreadsheetEditorProps {
  spreadsheet: LocalSpreadsheet;
  onUpdate: (spreadsheet: LocalSpreadsheet) => void;
}

// Formula parser (simple implementation)
const parseFormula = (formula: string, rows: SpreadsheetRow[], columns: SpreadsheetColumn[]): string => {
  if (!formula.startsWith('=')) return formula;

  const formulaUpper = formula.toUpperCase();

  // SUM function
  const sumMatch = formulaUpper.match(/=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (sumMatch) {
    const [, startCol, startRowStr, endCol, endRowStr] = sumMatch;
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

export function SpreadsheetEditor({ spreadsheet, onUpdate }: SpreadsheetEditorProps) {
  const gridRef = useRef<DataSheetGridRef>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
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

  const { columns, rows } = spreadsheet.data;

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
                Formatação condicional
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
          return cn(
            format.bold && 'font-bold',
          );
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

    onUpdate({
      ...spreadsheet,
      updatedAt: new Date().toISOString(),
      data: {
        ...spreadsheet.data,
        rows: newRows,
      },
    });
  }, [spreadsheet, onUpdate]);

  // Add row
  const handleAddRow = () => {
    const newRow: SpreadsheetRow = {
      id: `row-${Date.now()}`,
      cells: {},
    };
    onUpdate({
      ...spreadsheet,
      updatedAt: new Date().toISOString(),
      data: {
        ...spreadsheet.data,
        rows: [...rows, newRow],
      },
    });
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
      toast.error('Nome da coluna é obrigatório');
      return;
    }

    if (editingColumn) {
      // Update existing column
      onUpdate({
        ...spreadsheet,
        updatedAt: new Date().toISOString(),
        data: {
          ...spreadsheet.data,
          columns: columns.map(col =>
            col.id === editingColumn.id
              ? { ...col, name: newColumnName.trim(), type: newColumnType }
              : col
          ),
        },
      });
      toast.success('Coluna atualizada!');
    } else {
      // Add new column
      const newCol: SpreadsheetColumn = {
        id: `col-${Date.now()}`,
        name: newColumnName.trim(),
        type: newColumnType,
        width: 150,
      };
      onUpdate({
        ...spreadsheet,
        updatedAt: new Date().toISOString(),
        data: {
          ...spreadsheet.data,
          columns: [...columns, newCol],
        },
      });
      toast.success('Coluna adicionada!');
    }

    setColumnModalOpen(false);
  };

  const handleDeleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      toast.error('A tabela precisa ter pelo menos uma coluna');
      return;
    }
    onUpdate({
      ...spreadsheet,
      updatedAt: new Date().toISOString(),
      data: {
        columns: columns.filter(c => c.id !== colId),
        rows: rows.map(row => ({
          ...row,
          cells: Object.fromEntries(
            Object.entries(row.cells).filter(([key]) => key !== colId)
          ),
        })),
      },
    });
    toast.success('Coluna excluída!');
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

    onUpdate({
      ...spreadsheet,
      updatedAt: new Date().toISOString(),
      data: {
        ...spreadsheet.data,
        rows: sortedRows,
      },
    });
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
      toast.error('Valor é obrigatório');
      return;
    }

    const newFormat: ConditionalFormat = {
      condition: formatCondition,
      value: formatValue,
      value2: formatValue2 || undefined,
      backgroundColor: formatBgColor,
      textColor: formatTextColor,
    };

    onUpdate({
      ...spreadsheet,
      updatedAt: new Date().toISOString(),
      data: {
        ...spreadsheet.data,
        columns: columns.map(col =>
          col.id === formatColumn.id
            ? { ...col, format: [...(col.format || []), newFormat] }
            : col
        ),
      },
    });

    toast.success('Formatação adicionada!');
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
              Fórmulas
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
              =AVG(A1:A10) - Média
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormulaInput('=MIN(A1:A10)')}>
              =MIN(A1:A10) - Mínimo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFormulaInput('=MAX(A1:A10)')}>
              =MAX(A1:A10) - Máximo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Formula bar */}
      {formulaInput && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium text-muted-foreground">fx</span>
          <Input
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            className="flex-1 h-8"
            placeholder="Digite uma fórmula..."
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
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="currency">Moeda (R$)</SelectItem>
                  <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                  <SelectItem value="formula">Fórmula</SelectItem>
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
            <DialogTitle>Formatação Condicional</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Condição</Label>
              <Select value={formatCondition} onValueChange={(v: any) => setFormatCondition(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greaterThan">Maior que</SelectItem>
                  <SelectItem value="lessThan">Menor que</SelectItem>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="between">Entre</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="isEmpty">Está vazio</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formatCondition !== 'isEmpty' && (
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input
                  value={formatValue}
                  onChange={(e) => setFormatValue(e.target.value)}
                  placeholder="Valor de comparação"
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
              <Label className="text-xs text-muted-foreground">Prévia</Label>
              <div
                className="mt-2 p-2 rounded text-sm"
                style={{
                  backgroundColor: formatBgColor,
                  color: formatTextColor,
                }}
              >
                Exemplo de célula formatada
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

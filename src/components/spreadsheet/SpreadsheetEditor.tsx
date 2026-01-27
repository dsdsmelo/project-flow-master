import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Trash2,
  Download,
  Loader2,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Cloud,
  RefreshCw,
  WrapText,
  Columns,
  Rows,
  ChevronDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paintbrush,
  Type,
  Merge,
  Clipboard,
} from 'lucide-react';
import { useSpreadsheetClipboard, ClipboardData } from '@/hooks/useSpreadsheetClipboard';
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
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useData } from '@/contexts/DataContext';
import { Spreadsheet, SpreadsheetColumn, SpreadsheetRow, SpreadsheetCell } from '@/lib/types';

interface SpreadsheetEditorProps {
  spreadsheet: Spreadsheet;
}

interface CellStyle {
  bgColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface CellData {
  value: string;
  style?: CellStyle;
}

interface RowData {
  id: string;
  cells: { [colId: string]: CellData };
  height: number;
}

interface ColData extends SpreadsheetColumn {
  width: number;
}

// Color palette for background
const BG_COLORS = [
  { color: '', label: 'Nenhuma' },
  { color: '#fef3c7', label: 'Amarelo claro' },
  { color: '#fde68a', label: 'Amarelo' },
  { color: '#fed7aa', label: 'Laranja claro' },
  { color: '#fecaca', label: 'Vermelho claro' },
  { color: '#fecdd3', label: 'Rosa claro' },
  { color: '#e9d5ff', label: 'Roxo claro' },
  { color: '#ddd6fe', label: 'Violeta claro' },
  { color: '#c7d2fe', label: 'Índigo claro' },
  { color: '#bfdbfe', label: 'Azul claro' },
  { color: '#a5f3fc', label: 'Ciano claro' },
  { color: '#99f6e4', label: 'Teal claro' },
  { color: '#bbf7d0', label: 'Verde claro' },
  { color: '#d9f99d', label: 'Lima claro' },
  { color: '#e5e7eb', label: 'Cinza claro' },
  { color: '#d1d5db', label: 'Cinza' },
];

// Color palette for text
const TEXT_COLORS = [
  { color: '', label: 'Padrão' },
  { color: '#000000', label: 'Preto' },
  { color: '#374151', label: 'Cinza escuro' },
  { color: '#6b7280', label: 'Cinza' },
  { color: '#dc2626', label: 'Vermelho' },
  { color: '#ea580c', label: 'Laranja' },
  { color: '#d97706', label: 'Âmbar' },
  { color: '#ca8a04', label: 'Amarelo' },
  { color: '#16a34a', label: 'Verde' },
  { color: '#0d9488', label: 'Teal' },
  { color: '#0891b2', label: 'Ciano' },
  { color: '#2563eb', label: 'Azul' },
  { color: '#7c3aed', label: 'Violeta' },
  { color: '#9333ea', label: 'Roxo' },
  { color: '#db2777', label: 'Rosa' },
  { color: '#be185d', label: 'Pink' },
];

export function SpreadsheetEditor({ spreadsheet }: SpreadsheetEditorProps) {
  const { fetchSpreadsheetData, saveSpreadsheetData } = useData();

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const [columns, setColumns] = useState<ColData[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);
  const [wrapText, setWrapText] = useState(false);

  // Editing states
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Selection state
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);

  // Resize states
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const [resizingRow, setResizingRow] = useState<string | null>(null);
  const resizeStartRef = useRef<{ pos: number; size: number }>({ pos: 0, size: 0 });

  // Get current cell style
  const getCurrentCellStyle = (): CellStyle => {
    if (!selectedCell) return {};
    const row = rows.find(r => r.id === selectedCell.rowId);
    return row?.cells[selectedCell.colId]?.style || {};
  };

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchSpreadsheetData(spreadsheet.id);
        if (!mounted) return;

        if (data.columns.length === 0) {
          const defaultCols: ColData[] = ['A', 'B', 'C', 'D', 'E'].map((letter, i) => ({
            id: crypto.randomUUID(),
            spreadsheetId: spreadsheet.id,
            name: letter,
            type: 'text',
            width: 150,
            orderIndex: i,
            createdAt: new Date().toISOString(),
          }));
          const defaultRows: RowData[] = Array.from({ length: 10 }, () => ({
            id: crypto.randomUUID(),
            cells: {},
            height: 36,
          }));
          setColumns(defaultCols);
          setRows(defaultRows);
          queueSave(defaultCols, defaultRows);
        } else {
          const cols: ColData[] = data.columns.map(c => ({ ...c, width: c.width || 150 }));
          setColumns(cols);
          const loadedRows: RowData[] = data.rows.map(r => {
            const cells: { [colId: string]: CellData } = {};
            data.cells.filter(c => c.rowId === r.id).forEach(c => {
              // Parse style from formula field (we store JSON there)
              let style: CellStyle = {};
              if (c.formula) {
                try {
                  style = JSON.parse(c.formula);
                } catch {}
              }
              cells[c.columnId] = { value: c.value || '', style };
            });
            return { id: r.id, cells, height: 36 };
          });
          setRows(loadedRows.length > 0 ? loadedRows : Array.from({ length: 10 }, () => ({ id: crypto.randomUUID(), cells: {}, height: 36 })));
        }
      } catch (err) {
        console.error('Load error:', err);
        toast.error('Erro ao carregar planilha');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [spreadsheet.id]);

  // Save function
  const doSave = useCallback(async (cols: ColData[], rws: RowData[]) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus('saving');

    try {
      const dbCols = cols.map((c, i) => ({ ...c, spreadsheetId: spreadsheet.id, orderIndex: i }));
      const dbRows: SpreadsheetRow[] = rws.map((r, i) => ({
        id: r.id,
        spreadsheetId: spreadsheet.id,
        orderIndex: i,
        createdAt: new Date().toISOString(),
      }));
      const dbCells: SpreadsheetCell[] = [];
      rws.forEach(r => {
        Object.entries(r.cells).forEach(([colId, cellData]) => {
          if (cellData.value || (cellData.style && Object.keys(cellData.style).length > 0)) {
            dbCells.push({
              id: crypto.randomUUID(),
              rowId: r.id,
              columnId: colId,
              value: cellData.value,
              formula: cellData.style ? JSON.stringify(cellData.style) : undefined,
            });
          }
        });
      });

      await saveSpreadsheetData(spreadsheet.id, dbCols, dbRows, dbCells);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [spreadsheet.id, saveSpreadsheetData]);

  const queueSave = useCallback((cols: ColData[], rws: RowData[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(cols, rws), 1500);
  }, [doSave]);

  // Clipboard hook
  const { handleCopy, handlePaste } = useSpreadsheetClipboard({
    rows,
    columns,
    selectedCell,
    editingCell,
    editingColId,
  });

  // Handle paste data with auto-expand
  const handlePasteData = useCallback(async () => {
    const data = await handlePaste();
    if (!data || !selectedCell) return;

    const { cells: pasteData, rowCount, colCount } = data;

    // Find starting position
    const startRowIndex = rows.findIndex(r => r.id === selectedCell.rowId);
    const startColIndex = columns.findIndex(c => c.id === selectedCell.colId);

    if (startRowIndex < 0 || startColIndex < 0) return;

    // Calculate how many rows/columns we need
    const requiredRows = startRowIndex + rowCount;
    const requiredCols = startColIndex + colCount;

    let newColumns = [...columns];
    let newRows = [...rows];

    // Auto-expand columns if needed (limit to 100 new columns)
    const maxNewCols = Math.min(requiredCols, columns.length + 100);
    while (newColumns.length < maxNewCols) {
      const letter = String.fromCharCode(65 + (newColumns.length % 26));
      const prefix = newColumns.length >= 26 ? String.fromCharCode(64 + Math.floor(newColumns.length / 26)) : '';
      newColumns.push({
        id: crypto.randomUUID(),
        spreadsheetId: spreadsheet.id,
        name: prefix + letter,
        type: 'text',
        width: 150,
        orderIndex: newColumns.length,
        createdAt: new Date().toISOString(),
      });
    }

    // Auto-expand rows if needed (limit to 100 new rows)
    const maxNewRows = Math.min(requiredRows, rows.length + 100);
    while (newRows.length < maxNewRows) {
      newRows.push({
        id: crypto.randomUUID(),
        cells: {},
        height: 36,
      });
    }

    // Apply pasted data
    for (let r = 0; r < rowCount; r++) {
      const targetRowIndex = startRowIndex + r;
      if (targetRowIndex >= newRows.length) break;

      const targetRow = newRows[targetRowIndex];

      for (let c = 0; c < colCount; c++) {
        const targetColIndex = startColIndex + c;
        if (targetColIndex >= newColumns.length) break;

        const targetCol = newColumns[targetColIndex];
        const pasteCell = pasteData[r]?.[c];

        if (targetRow && targetCol && pasteCell) {
          const existingCell = targetRow.cells[targetCol.id] || { value: '' };
          targetRow.cells[targetCol.id] = {
            ...existingCell,
            value: pasteCell.value,
          };
        }
      }
    }

    // Update state
    if (newColumns.length !== columns.length) {
      setColumns(newColumns);
    }
    setRows([...newRows]);
    queueSave(newColumns, newRows);

    toast.success(`Colado: ${rowCount} linha${rowCount > 1 ? 's' : ''} × ${colCount} coluna${colCount > 1 ? 's' : ''}`);
  }, [handlePaste, selectedCell, rows, columns, spreadsheet.id, queueSave]);

  // Keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CRITICAL: Don't interfere with text editing
      if (editingCell || editingColId) return;

      // Skip if focus is on an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const modKey = e.metaKey || e.ctrlKey;

      if (modKey && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (modKey && e.key === 'v') {
        e.preventDefault();
        handlePasteData();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingCell, editingColId, handleCopy, handlePasteData]);

  // Cell editing
  const startEditCell = (rowId: string, colId: string) => {
    const row = rows.find(r => r.id === rowId);
    setEditValue(row?.cells[colId]?.value || '');
    setEditingCell({ rowId, colId });
    setSelectedCell({ rowId, colId });
  };

  const saveCell = () => {
    if (!editingCell) return;
    const newRows = rows.map(r => {
      if (r.id === editingCell.rowId) {
        const existingCell = r.cells[editingCell.colId] || { value: '' };
        return {
          ...r,
          cells: {
            ...r.cells,
            [editingCell.colId]: { ...existingCell, value: editValue }
          }
        };
      }
      return r;
    });
    setRows(newRows);
    setEditingCell(null);
    queueSave(columns, newRows);
  };

  // Column header editing
  const startEditColumn = (colId: string) => {
    const col = columns.find(c => c.id === colId);
    setEditValue(col?.name || '');
    setEditingColId(colId);
  };

  const saveColumn = () => {
    if (!editingColId) return;
    const newCols = columns.map(c => {
      if (c.id === editingColId) {
        return { ...c, name: editValue.trim() || c.name };
      }
      return c;
    });
    setColumns(newCols);
    setEditingColId(null);
    queueSave(newCols, rows);
  };

  // Apply style to selected cell
  const applyStyle = (styleUpdate: Partial<CellStyle>) => {
    if (!selectedCell) {
      toast.error('Selecione uma célula primeiro');
      return;
    }

    const newRows = rows.map(r => {
      if (r.id === selectedCell.rowId) {
        const existingCell = r.cells[selectedCell.colId] || { value: '' };
        const existingStyle = existingCell.style || {};
        return {
          ...r,
          cells: {
            ...r.cells,
            [selectedCell.colId]: {
              ...existingCell,
              style: { ...existingStyle, ...styleUpdate }
            }
          }
        };
      }
      return r;
    });
    setRows(newRows);
    queueSave(columns, newRows);
  };

  // Toggle style
  const toggleStyle = (key: 'bold' | 'italic' | 'underline') => {
    const currentStyle = getCurrentCellStyle();
    applyStyle({ [key]: !currentStyle[key] });
  };

  // Column resize
  const startColResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    setResizingCol(colId);
    resizeStartRef.current = { pos: e.clientX, size: col.width };

    const handleMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartRef.current.pos;
      const newWidth = Math.max(60, resizeStartRef.current.size + delta);
      setColumns(prev => prev.map(c => c.id === colId ? { ...c, width: newWidth } : c));
    };

    const handleUp = () => {
      setResizingCol(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      queueSave(columns, rows);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // Row resize
  const startRowResize = (e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    setResizingRow(rowId);
    resizeStartRef.current = { pos: e.clientY, size: row.height };

    const handleMove = (e: MouseEvent) => {
      const delta = e.clientY - resizeStartRef.current.pos;
      const newHeight = Math.max(24, resizeStartRef.current.size + delta);
      setRows(prev => prev.map(r => r.id === rowId ? { ...r, height: newHeight } : r));
    };

    const handleUp = () => {
      setResizingRow(null);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      queueSave(columns, rows);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  // Set all columns width
  const setAllColumnsWidth = (width: number) => {
    const newCols = columns.map(c => ({ ...c, width }));
    setColumns(newCols);
    queueSave(newCols, rows);
  };

  // Set all rows height
  const setAllRowsHeight = (height: number) => {
    const newRows = rows.map(r => ({ ...r, height }));
    setRows(newRows);
    queueSave(columns, newRows);
  };

  // Add column
  const addColumn = () => {
    const letter = String.fromCharCode(65 + columns.length);
    const newCol: ColData = {
      id: crypto.randomUUID(),
      spreadsheetId: spreadsheet.id,
      name: letter,
      type: 'text',
      width: 150,
      orderIndex: columns.length,
      createdAt: new Date().toISOString(),
    };
    const newCols = [...columns, newCol];
    setColumns(newCols);
    queueSave(newCols, rows);
    toast.success(`Coluna ${letter} adicionada`);
  };

  // Delete column
  const deleteColumn = (colId: string) => {
    if (columns.length <= 1) {
      toast.error('Precisa ter pelo menos 1 coluna');
      return;
    }
    const newCols = columns.filter(c => c.id !== colId);
    const newRows = rows.map(r => {
      const { [colId]: _, ...rest } = r.cells;
      return { ...r, cells: rest };
    });
    setColumns(newCols);
    setRows(newRows);
    queueSave(newCols, newRows);
  };

  // Add row
  const addRow = () => {
    const newRow: RowData = { id: crypto.randomUUID(), cells: {}, height: 36 };
    const newRows = [...rows, newRow];
    setRows(newRows);
    queueSave(columns, newRows);
  };

  // Delete row
  const deleteRow = (rowId: string) => {
    if (rows.length <= 1) {
      toast.error('Precisa ter pelo menos 1 linha');
      return;
    }
    const newRows = rows.filter(r => r.id !== rowId);
    setRows(newRows);
    queueSave(columns, newRows);
  };

  // Sort column
  const sortColumn = (colId: string, direction: 'asc' | 'desc') => {
    const sorted = [...rows].sort((a, b) => {
      const aVal = a.cells[colId]?.value || '';
      const bVal = b.cells[colId]?.value || '';
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    setRows(sorted);
    queueSave(columns, sorted);
  };

  // Export
  const exportExcel = () => {
    const data = [
      columns.map(c => c.name),
      ...rows.map(r => columns.map(c => r.cells[c.id]?.value || '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = columns.map(c => ({ wch: Math.round(c.width / 8) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spreadsheet.name);
    XLSX.writeFile(wb, `${spreadsheet.name}.xlsx`);
    toast.success('Exportado!');
  };

  // Calculate formula
  const calculateValue = (value: string): string => {
    if (!value.startsWith('=')) return value;
    const formula = value.toUpperCase();

    const sumMatch = formula.match(/=SUM\(([A-Z])(\d+):([A-Z])(\d+)\)/);
    if (sumMatch) {
      const [, colLetter, startRow, , endRow] = sumMatch;
      const colIdx = colLetter.charCodeAt(0) - 65;
      const colId = columns[colIdx]?.id;
      if (!colId) return '#ERR';
      let sum = 0;
      for (let i = parseInt(startRow) - 1; i <= parseInt(endRow) - 1 && i < rows.length; i++) {
        const val = parseFloat(rows[i].cells[colId]?.value || '0');
        if (!isNaN(val)) sum += val;
      }
      return sum.toString();
    }

    const avgMatch = formula.match(/=AVG\(([A-Z])(\d+):([A-Z])(\d+)\)/);
    if (avgMatch) {
      const [, colLetter, startRow, , endRow] = avgMatch;
      const colIdx = colLetter.charCodeAt(0) - 65;
      const colId = columns[colIdx]?.id;
      if (!colId) return '#ERR';
      let sum = 0, count = 0;
      for (let i = parseInt(startRow) - 1; i <= parseInt(endRow) - 1 && i < rows.length; i++) {
        const val = parseFloat(rows[i].cells[colId]?.value || '');
        if (!isNaN(val)) { sum += val; count++; }
      }
      return count > 0 ? (sum / count).toFixed(2) : '0';
    }

    return value;
  };

  const currentStyle = getCurrentCellStyle();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate total table width
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0) + 48; // 48 for row number column

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-lg border flex-wrap">
        {/* Structural */}
        <Button variant="outline" size="sm" onClick={addRow} title="Adicionar linha">
          <Plus className="h-4 w-4 mr-1" />Linha
        </Button>
        <Button variant="outline" size="sm" onClick={addColumn} title="Adicionar coluna">
          <Plus className="h-4 w-4 mr-1" />Coluna
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Text Formatting */}
        <Button
          variant={currentStyle.bold ? "default" : "outline"}
          size="sm"
          onClick={() => toggleStyle('bold')}
          title="Negrito"
          className="w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={currentStyle.italic ? "default" : "outline"}
          size="sm"
          onClick={() => toggleStyle('italic')}
          title="Itálico"
          className="w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={currentStyle.underline ? "default" : "outline"}
          size="sm"
          onClick={() => toggleStyle('underline')}
          title="Sublinhado"
          className="w-8 p-0"
        >
          <Underline className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Alignment */}
        <Button
          variant={currentStyle.align === 'left' || !currentStyle.align ? "default" : "outline"}
          size="sm"
          onClick={() => applyStyle({ align: 'left' })}
          title="Alinhar à esquerda"
          className="w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          variant={currentStyle.align === 'center' ? "default" : "outline"}
          size="sm"
          onClick={() => applyStyle({ align: 'center' })}
          title="Centralizar"
          className="w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          variant={currentStyle.align === 'right' ? "default" : "outline"}
          size="sm"
          onClick={() => applyStyle({ align: 'right' })}
          title="Alinhar à direita"
          className="w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Background Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Cor de fundo" className="gap-1">
              <Paintbrush className="h-4 w-4" />
              <div
                className="w-4 h-3 rounded border"
                style={{ backgroundColor: currentStyle.bgColor || '#ffffff' }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2">
            <p className="text-xs font-medium mb-2">Cor de fundo</p>
            <div className="grid grid-cols-4 gap-1">
              {BG_COLORS.map((c) => (
                <button
                  key={c.color || 'none'}
                  className={`w-10 h-8 rounded border hover:scale-110 transition-transform ${
                    currentStyle.bgColor === c.color ? 'ring-2 ring-primary ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: c.color || '#ffffff' }}
                  onClick={() => applyStyle({ bgColor: c.color })}
                  title={c.label}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Cor do texto" className="gap-1">
              <Type className="h-4 w-4" />
              <div
                className="w-4 h-1 rounded"
                style={{ backgroundColor: currentStyle.textColor || '#000000' }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-2">
            <p className="text-xs font-medium mb-2">Cor do texto</p>
            <div className="grid grid-cols-4 gap-1">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.color || 'default'}
                  className={`w-10 h-8 rounded border hover:scale-110 transition-transform flex items-center justify-center ${
                    currentStyle.textColor === c.color ? 'ring-2 ring-primary ring-offset-1' : ''
                  }`}
                  onClick={() => applyStyle({ textColor: c.color })}
                  title={c.label}
                >
                  <span style={{ color: c.color || '#000000', fontWeight: 600 }}>A</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Wrap Text */}
        <Button
          variant={wrapText ? "default" : "outline"}
          size="sm"
          onClick={() => setWrapText(!wrapText)}
          title="Quebra de texto"
        >
          <WrapText className="h-4 w-4" />
        </Button>

        {/* Column Width */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Largura das colunas">
              <Columns className="h-4 w-4 mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <p className="text-xs font-medium mb-3">Largura de todas as colunas</p>
            <div className="space-y-3">
              <Slider
                defaultValue={[150]}
                min={60}
                max={400}
                step={10}
                onValueCommit={(v) => setAllColumnsWidth(v[0])}
              />
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllColumnsWidth(80)}>80</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllColumnsWidth(120)}>120</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllColumnsWidth(150)}>150</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllColumnsWidth(200)}>200</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Row Height */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Altura das linhas">
              <Rows className="h-4 w-4 mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3">
            <p className="text-xs font-medium mb-3">Altura de todas as linhas</p>
            <div className="space-y-3">
              <Slider
                defaultValue={[36]}
                min={24}
                max={100}
                step={4}
                onValueCommit={(v) => setAllRowsHeight(v[0])}
              />
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllRowsHeight(28)}>28</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllRowsHeight(36)}>36</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllRowsHeight(50)}>50</Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setAllRowsHeight(80)}>80</Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Paste */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePasteData}
          title="Colar (Ctrl+V)"
          disabled={!selectedCell}
        >
          <Clipboard className="h-4 w-4 mr-1" />Colar
        </Button>

        {/* Export */}
        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-1" />Excel
        </Button>

        <div className="flex-1" />

        {/* Save status */}
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Salvando...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Cloud className="h-3 w-3" /> Salvo
            </span>
          )}
          {saveStatus === 'error' && (
            <Button variant="destructive" size="sm" onClick={() => doSave(columns, rows)}>
              <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="border rounded-lg overflow-auto bg-card" style={{ maxHeight: '60vh' }}>
        <table
          className="border-collapse"
          style={{ width: totalWidth, minWidth: '100%', tableLayout: 'fixed' }}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            {columns.map((col) => (
              <col key={col.id} style={{ width: col.width }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="bg-muted/80 backdrop-blur">
              {/* Corner */}
              <th className="border-r border-b text-center text-xs font-medium text-muted-foreground p-2 bg-muted/80">
                #
              </th>
              {/* Column headers */}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="border-r border-b text-left p-0 group relative bg-muted/80"
                >
                  {editingColId === col.id ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveColumn}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveColumn();
                        if (e.key === 'Escape') setEditingColId(null);
                      }}
                      autoFocus
                      className="w-full px-2 py-2 text-xs font-semibold bg-white dark:bg-gray-800 border-2 border-primary outline-none"
                    />
                  ) : (
                    <div className="flex items-center justify-between px-2 py-2">
                      <span
                        className="text-xs font-semibold cursor-text flex-1 truncate"
                        onClick={() => startEditColumn(col.id)}
                      >
                        {col.name}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditColumn(col.id)}>Renomear</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => sortColumn(col.id, 'asc')}>
                            <ArrowUp className="h-4 w-4 mr-2" /> Ordenar A-Z
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sortColumn(col.id, 'desc')}>
                            <ArrowDown className="h-4 w-4 mr-2" /> Ordenar Z-A
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Columns className="h-4 w-4 mr-2" /> Largura
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => {
                                const newCols = columns.map(c => c.id === col.id ? { ...c, width: 80 } : c);
                                setColumns(newCols);
                                queueSave(newCols, rows);
                              }}>Estreita (80px)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const newCols = columns.map(c => c.id === col.id ? { ...c, width: 150 } : c);
                                setColumns(newCols);
                                queueSave(newCols, rows);
                              }}>Normal (150px)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const newCols = columns.map(c => c.id === col.id ? { ...c, width: 250 } : c);
                                setColumns(newCols);
                                queueSave(newCols, rows);
                              }}>Larga (250px)</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => deleteColumn(col.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 active:bg-primary"
                    onMouseDown={(e) => startColResize(e, col.id)}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="group/row hover:bg-muted/20 relative">
                {/* Row number */}
                <td
                  className="border-r border-b text-center text-xs text-muted-foreground bg-muted/30 relative"
                  style={{ height: row.height }}
                >
                  <div className="flex items-center justify-center h-full">
                    <span className="group-hover/row:hidden">{rowIndex + 1}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hidden group-hover/row:block p-0.5 rounded hover:bg-muted">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={addRow}>
                          <Plus className="h-4 w-4 mr-2" /> Adicionar linha
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Rows className="h-4 w-4 mr-2" /> Altura
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => {
                              const newRows = rows.map(r => r.id === row.id ? { ...r, height: 28 } : r);
                              setRows(newRows);
                              queueSave(columns, newRows);
                            }}>Compacta (28px)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const newRows = rows.map(r => r.id === row.id ? { ...r, height: 36 } : r);
                              setRows(newRows);
                              queueSave(columns, newRows);
                            }}>Normal (36px)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const newRows = rows.map(r => r.id === row.id ? { ...r, height: 60 } : r);
                              setRows(newRows);
                              queueSave(columns, newRows);
                            }}>Alta (60px)</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteRow(row.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Row resize handle */}
                  <div
                    className="absolute left-0 right-0 bottom-0 h-1.5 cursor-row-resize hover:bg-primary/50 active:bg-primary"
                    onMouseDown={(e) => startRowResize(e, row.id)}
                  />
                </td>
                {/* Cells */}
                {columns.map((col) => {
                  const cell = row.cells[col.id];
                  const cellStyle = cell?.style || {};
                  const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === col.id;
                  const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;

                  return (
                    <td
                      key={col.id}
                      className={`border-r border-b p-0 ${isSelected && !isEditing ? 'ring-2 ring-primary ring-inset' : ''}`}
                      style={{ height: row.height }}
                      onClick={() => !isEditing && setSelectedCell({ rowId: row.id, colId: col.id })}
                    >
                      {isEditing ? (
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveCell}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveCell();
                              const nextRowIndex = rowIndex + 1;
                              if (nextRowIndex < rows.length) {
                                setTimeout(() => startEditCell(rows[nextRowIndex].id, col.id), 50);
                              }
                            }
                            if (e.key === 'Escape') setEditingCell(null);
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              saveCell();
                              const colIndex = columns.findIndex(c => c.id === col.id);
                              const nextColIndex = colIndex + 1;
                              if (nextColIndex < columns.length) {
                                setTimeout(() => startEditCell(row.id, columns[nextColIndex].id), 50);
                              }
                            }
                          }}
                          autoFocus
                          className="w-full h-full px-2 py-1 text-sm bg-white dark:bg-gray-800 border-2 border-primary outline-none resize-none"
                          style={{ minHeight: row.height }}
                        />
                      ) : (
                        <div
                          className="w-full h-full px-2 py-1 text-sm cursor-cell hover:bg-primary/5 overflow-hidden"
                          style={{
                            backgroundColor: cellStyle.bgColor || undefined,
                            color: cellStyle.textColor || undefined,
                            fontWeight: cellStyle.bold ? 'bold' : undefined,
                            fontStyle: cellStyle.italic ? 'italic' : undefined,
                            textDecoration: cellStyle.underline ? 'underline' : undefined,
                            textAlign: cellStyle.align || 'left',
                            whiteSpace: wrapText ? 'pre-wrap' : 'nowrap',
                            wordBreak: wrapText ? 'break-word' : 'normal',
                            minHeight: row.height,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: cellStyle.align === 'center' ? 'center' : cellStyle.align === 'right' ? 'flex-end' : 'flex-start',
                          }}
                          onDoubleClick={() => startEditCell(row.id, col.id)}
                        >
                          {calculateValue(cell?.value || '')}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{rows.length} linhas × {columns.length} colunas</span>
        <span>Clique para selecionar • Duplo clique para editar • Ctrl+C/V para copiar/colar</span>
      </div>
    </div>
  );
}

export default SpreadsheetEditor;

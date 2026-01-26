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
  Loader2,
  Copy,
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
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
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

interface GridRow {
  id: string;
  cells: Record<string, string>;
}

// Color palette
const BG_COLORS = [
  { name: 'Nenhum', value: '' },
  { name: 'Vermelho', value: '#fecaca' },
  { name: 'Laranja', value: '#fed7aa' },
  { name: 'Amarelo', value: '#fef08a' },
  { name: 'Verde', value: '#bbf7d0' },
  { name: 'Azul', value: '#bfdbfe' },
  { name: 'Roxo', value: '#e9d5ff' },
  { name: 'Rosa', value: '#fbcfe8' },
  { name: 'Cinza', value: '#e5e7eb' },
];

// Formula parser
const parseFormula = (formula: string, rows: GridRow[], columns: SpreadsheetColumn[]): string => {
  if (!formula.startsWith('=')) return formula;
  const f = formula.toUpperCase();

  const sumMatch = f.match(/=SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (sumMatch) {
    const [, col, start, , end] = sumMatch;
    const colIdx = col.charCodeAt(0) - 65;
    let sum = 0;
    for (let i = parseInt(start) - 1; i <= parseInt(end) - 1 && i < rows.length; i++) {
      const colId = columns[colIdx]?.id;
      if (colId) {
        const val = parseFloat(rows[i].cells[colId] || '0');
        if (!isNaN(val)) sum += val;
      }
    }
    return sum.toString();
  }

  const countMatch = f.match(/=COUNT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (countMatch) {
    const [, col, start, , end] = countMatch;
    const colIdx = col.charCodeAt(0) - 65;
    let count = 0;
    for (let i = parseInt(start) - 1; i <= parseInt(end) - 1 && i < rows.length; i++) {
      const colId = columns[colIdx]?.id;
      if (colId && rows[i].cells[colId]) count++;
    }
    return count.toString();
  }

  const avgMatch = f.match(/=AVG\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/);
  if (avgMatch) {
    const [, col, start, , end] = avgMatch;
    const colIdx = col.charCodeAt(0) - 65;
    let sum = 0, count = 0;
    for (let i = parseInt(start) - 1; i <= parseInt(end) - 1 && i < rows.length; i++) {
      const colId = columns[colIdx]?.id;
      if (colId) {
        const val = parseFloat(rows[i].cells[colId] || '');
        if (!isNaN(val)) { sum += val; count++; }
      }
    }
    return count > 0 ? (sum / count).toFixed(2) : '0';
  }

  return formula;
};

// Column Header with inline edit
function ColumnHeader({
  column,
  onRename,
  onSort,
  onDelete,
  onChangeType,
  canDelete
}: {
  column: SpreadsheetColumn;
  onRename: (name: string) => void;
  onSort: (dir: 'asc' | 'desc') => void;
  onDelete: () => void;
  onChangeType: (type: string) => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(column.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setValue(column.name);
  }, [column.name, editing]);

  const save = () => {
    const v = value.trim();
    if (v && v !== column.name) onRename(v);
    else setValue(column.name);
    setEditing(false);
  };

  const typeIcon = () => {
    switch (column.type) {
      case 'number': return <Hash className="h-3 w-3" />;
      case 'date': return <Calendar className="h-3 w-3" />;
      case 'currency': return <DollarSign className="h-3 w-3" />;
      case 'percentage': return <Percent className="h-3 w-3" />;
      default: return <Type className="h-3 w-3" />;
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setValue(column.name); setEditing(false); } }}
        onBlur={save}
        onClick={e => e.stopPropagation()}
        className="w-full px-2 py-0.5 text-xs font-medium bg-white dark:bg-gray-800 border-2 border-primary rounded outline-none"
      />
    );
  }

  return (
    <div className="flex items-center justify-between w-full group">
      <div
        className="flex items-center gap-1 flex-1 cursor-text truncate"
        onDoubleClick={() => setEditing(true)}
      >
        <span className="text-muted-foreground">{typeIcon()}</span>
        <span className="font-medium text-xs truncate">{column.name}</span>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted/80" onClick={e => e.stopPropagation()}>
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => setEditing(true)}>Renomear</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger><Type className="h-4 w-4 mr-2" />Tipo</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onChangeType('text')}><Type className="h-4 w-4 mr-2" />Texto{column.type === 'text' && <Check className="h-4 w-4 ml-auto" />}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType('number')}><Hash className="h-4 w-4 mr-2" />Número{column.type === 'number' && <Check className="h-4 w-4 ml-auto" />}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeType('currency')}><DollarSign className="h-4 w-4 mr-2" />Moeda{column.type === 'currency' && <Check className="h-4 w-4 ml-auto" />}</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSort('asc')}><ArrowUpDown className="h-4 w-4 mr-2" />Ordenar A-Z</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSort('desc')}><ArrowUpDown className="h-4 w-4 mr-2" />Ordenar Z-A</DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Excluir</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SpreadsheetEditor({ spreadsheet }: SpreadsheetEditorProps) {
  const { fetchSpreadsheetData, saveSpreadsheetData } = useData();
  const gridRef = useRef<DataSheetGridRef>(null);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const dataRef = useRef<{ columns: SpreadsheetColumn[]; rows: GridRow[] }>({ columns: [], rows: [] });

  const [columns, setColumns] = useState<SpreadsheetColumn[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [selectedCell, setSelectedCell] = useState<string>('A1');
  const [formulaValue, setFormulaValue] = useState('');

  // Load data once
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchSpreadsheetData(spreadsheet.id);
        if (!mounted) return;

        if (data.columns.length === 0) {
          const cols: SpreadsheetColumn[] = ['A', 'B', 'C', 'D', 'E'].map((letter, i) => ({
            id: crypto.randomUUID(),
            spreadsheetId: spreadsheet.id,
            name: `Coluna ${letter}`,
            type: 'text',
            width: 120,
            orderIndex: i,
            createdAt: new Date().toISOString(),
          }));
          const rws: GridRow[] = Array.from({ length: 15 }, () => ({ id: crypto.randomUUID(), cells: {} }));
          setColumns(cols);
          setRows(rws);
          dataRef.current = { columns: cols, rows: rws };
          queueSave(cols, rws);
        } else {
          setColumns(data.columns);
          const rws: GridRow[] = data.rows.map(r => {
            const cells: Record<string, string> = {};
            data.cells.filter(c => c.rowId === r.id).forEach(c => { cells[c.columnId] = c.value || ''; });
            return { id: r.id, cells };
          });
          if (rws.length === 0) {
            const defaultRows: GridRow[] = Array.from({ length: 15 }, () => ({ id: crypto.randomUUID(), cells: {} }));
            setRows(defaultRows);
            dataRef.current = { columns: data.columns, rows: defaultRows };
            queueSave(data.columns, defaultRows);
          } else {
            setRows(rws);
            dataRef.current = { columns: data.columns, rows: rws };
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [spreadsheet.id]);

  // Background save
  const doSave = useCallback(async (cols: SpreadsheetColumn[], rws: GridRow[]) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveStatus('saving');
    try {
      const dbCols = cols.map((c, i) => ({ ...c, spreadsheetId: spreadsheet.id, orderIndex: i }));
      const dbRows: SpreadsheetRow[] = rws.map((r, i) => ({ id: r.id, spreadsheetId: spreadsheet.id, orderIndex: i, createdAt: new Date().toISOString() }));
      const cells: SpreadsheetCell[] = [];
      rws.forEach(r => {
        Object.entries(r.cells).forEach(([colId, val]) => {
          if (val) cells.push({ id: crypto.randomUUID(), rowId: r.id, columnId: colId, value: val });
        });
      });
      await saveSpreadsheetData(spreadsheet.id, dbCols, dbRows, cells);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [spreadsheet.id, saveSpreadsheetData]);

  const queueSave = useCallback((cols: SpreadsheetColumn[], rws: GridRow[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(cols, rws), 2000);
  }, [doSave]);

  // Grid data
  const gridData = useMemo(() => rows.map(r => {
    const row: Record<string, string> = { _id: r.id };
    columns.forEach(c => {
      let v = r.cells[c.id] || '';
      if (v.startsWith('=')) v = parseFormula(v, rows, columns);
      row[c.id] = v;
    });
    return row;
  }), [rows, columns]);

  // Handlers
  const handleChange = useCallback((data: Record<string, string>[]) => {
    const newRows = data.map(r => ({
      id: r._id,
      cells: Object.fromEntries(Object.entries(r).filter(([k]) => k !== '_id')),
    }));
    setRows(newRows);
    dataRef.current.rows = newRows;
    queueSave(columns, newRows);
  }, [columns, queueSave]);

  const handleCellSelect = useCallback((cell: { col: number; row: number } | null) => {
    if (cell && cell.row >= 0 && cell.col >= 0) {
      const letter = String.fromCharCode(65 + cell.col);
      setSelectedCell(`${letter}${cell.row + 1}`);
      const colId = columns[cell.col]?.id;
      if (colId) setFormulaValue(rows[cell.row]?.cells[colId] || '');
    }
  }, [columns, rows]);

  const handleFormulaChange = useCallback((val: string) => {
    setFormulaValue(val);
    const match = selectedCell.match(/([A-Z]+)(\d+)/);
    if (match) {
      const colIdx = match[1].charCodeAt(0) - 65;
      const rowIdx = parseInt(match[2]) - 1;
      const colId = columns[colIdx]?.id;
      if (colId && rowIdx >= 0 && rowIdx < rows.length) {
        const newRows = rows.map((r, i) => i === rowIdx ? { ...r, cells: { ...r.cells, [colId]: val } } : r);
        setRows(newRows);
        dataRef.current.rows = newRows;
        queueSave(columns, newRows);
      }
    }
  }, [selectedCell, columns, rows, queueSave]);

  const addRow = useCallback(() => {
    const newRows = [...rows, { id: crypto.randomUUID(), cells: {} }];
    setRows(newRows);
    dataRef.current.rows = newRows;
    queueSave(columns, newRows);
  }, [rows, columns, queueSave]);

  const addColumn = useCallback(() => {
    const letter = String.fromCharCode(65 + columns.length);
    const newCol: SpreadsheetColumn = {
      id: crypto.randomUUID(),
      spreadsheetId: spreadsheet.id,
      name: `Coluna ${letter}`,
      type: 'text',
      width: 120,
      orderIndex: columns.length,
      createdAt: new Date().toISOString(),
    };
    const newCols = [...columns, newCol];
    setColumns(newCols);
    dataRef.current.columns = newCols;
    queueSave(newCols, rows);
  }, [columns, rows, spreadsheet.id, queueSave]);

  const renameColumn = useCallback((id: string, name: string) => {
    const newCols = columns.map(c => c.id === id ? { ...c, name } : c);
    setColumns(newCols);
    dataRef.current.columns = newCols;
    queueSave(newCols, rows);
  }, [columns, rows, queueSave]);

  const changeColumnType = useCallback((id: string, type: string) => {
    const newCols = columns.map(c => c.id === id ? { ...c, type } : c);
    setColumns(newCols);
    dataRef.current.columns = newCols;
    queueSave(newCols, rows);
  }, [columns, rows, queueSave]);

  const deleteColumn = useCallback((id: string) => {
    if (columns.length <= 1) return toast.error('Mínimo 1 coluna');
    const newCols = columns.filter(c => c.id !== id);
    const newRows = rows.map(r => ({ ...r, cells: Object.fromEntries(Object.entries(r.cells).filter(([k]) => k !== id)) }));
    setColumns(newCols);
    setRows(newRows);
    dataRef.current = { columns: newCols, rows: newRows };
    queueSave(newCols, newRows);
  }, [columns, rows, queueSave]);

  const sortColumn = useCallback((id: string, dir: 'asc' | 'desc') => {
    const sorted = [...rows].sort((a, b) => {
      const av = a.cells[id] || '', bv = b.cells[id] || '';
      const an = parseFloat(av), bn = parseFloat(bv);
      if (!isNaN(an) && !isNaN(bn)) return dir === 'asc' ? an - bn : bn - an;
      return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    setRows(sorted);
    dataRef.current.rows = sorted;
    queueSave(columns, sorted);
  }, [rows, columns, queueSave]);

  const exportExcel = () => {
    const data = [columns.map(c => c.name), ...rows.map(r => columns.map(c => r.cells[c.id] || ''))];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spreadsheet.name);
    XLSX.writeFile(wb, `${spreadsheet.name}.xlsx`);
    toast.success('Exportado!');
  };

  // Grid columns config
  const gridColumns: Column<Record<string, string>>[] = useMemo(() => columns.map(col => ({
    ...keyColumn(col.id, textColumn),
    title: (
      <ColumnHeader
        column={col}
        onRename={name => renameColumn(col.id, name)}
        onSort={dir => sortColumn(col.id, dir)}
        onDelete={() => deleteColumn(col.id)}
        onChangeType={type => changeColumnType(col.id, type)}
        canDelete={columns.length > 1}
      />
    ),
    minWidth: col.width,
  })), [columns, renameColumn, sortColumn, deleteColumn, changeColumnType]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-lg flex-wrap">
        <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" />Linha</Button>
        <Button variant="outline" size="sm" onClick={addColumn}><Plus className="h-4 w-4 mr-1" />Coluna</Button>

        <div className="h-5 w-px bg-border mx-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm"><Palette className="h-4 w-4" /></Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2">
            <p className="text-xs font-medium mb-2">Cor de fundo</p>
            <div className="grid grid-cols-3 gap-1">
              {BG_COLORS.map(c => (
                <button key={c.value || 'none'} className="h-6 w-full rounded border hover:border-primary" style={{ backgroundColor: c.value || '#fff' }} title={c.name} />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="outline" size="sm"><Bold className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm"><Italic className="h-4 w-4" /></Button>

        <div className="h-5 w-px bg-border mx-1" />

        <Button variant="outline" size="sm"><AlignLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm"><AlignCenter className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm"><AlignRight className="h-4 w-4" /></Button>

        <div className="h-5 w-px bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Excel</Button>

        <div className="flex-1" />

        {/* Status */}
        <div className="flex items-center gap-1 text-xs">
          {saveStatus === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /><span className="text-muted-foreground">Salvando...</span></>}
          {saveStatus === 'saved' && <><Cloud className="h-3 w-3 text-emerald-600" /><span className="text-emerald-600">Salvo</span></>}
          {saveStatus === 'error' && <><CloudOff className="h-3 w-3 text-destructive" /><span className="text-destructive">Erro</span></>}
        </div>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 p-1.5 bg-muted/20 rounded border">
        <span className="text-xs font-mono font-bold text-muted-foreground w-8 text-center">{selectedCell}</span>
        <div className="h-4 w-px bg-border" />
        <Input
          value={formulaValue}
          onChange={e => handleFormulaChange(e.target.value)}
          className="flex-1 h-7 text-sm font-mono border-0 bg-transparent focus-visible:ring-0"
          placeholder="Valor ou fórmula (=SUM, =AVG, =COUNT)"
        />
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden bg-card spreadsheet-editor">
        <DataSheetGrid
          ref={gridRef}
          value={gridData}
          onChange={handleChange}
          columns={gridColumns}
          height={Math.min(450, (rows.length + 1) * 32 + 40)}
          rowHeight={32}
          headerRowHeight={36}
          addRowsComponent={false}
          lockRows={false}
          onActiveCellChange={handleCellSelect}
          disableExpandSelection
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{rows.length} linhas × {columns.length} colunas</span>
        <span>Duplo clique na coluna para renomear • Fórmulas: =SUM(A1:A10), =AVG(), =COUNT()</span>
      </div>
    </div>
  );
}

export default SpreadsheetEditor;

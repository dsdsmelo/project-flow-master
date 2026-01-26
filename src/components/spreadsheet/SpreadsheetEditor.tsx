import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Download,
  Loader2,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useData } from '@/contexts/DataContext';
import { Spreadsheet, SpreadsheetColumn, SpreadsheetRow, SpreadsheetCell } from '@/lib/types';

interface SpreadsheetEditorProps {
  spreadsheet: Spreadsheet;
}

interface CellData {
  [colId: string]: string;
}

interface RowData {
  id: string;
  cells: CellData;
}

export function SpreadsheetEditor({ spreadsheet }: SpreadsheetEditorProps) {
  const { fetchSpreadsheetData, saveSpreadsheetData } = useData();

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const [columns, setColumns] = useState<SpreadsheetColumn[]>([]);
  const [rows, setRows] = useState<RowData[]>([]);

  // Editing states
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Load data
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchSpreadsheetData(spreadsheet.id);
        if (!mounted) return;

        if (data.columns.length === 0) {
          // Create default structure
          const defaultCols: SpreadsheetColumn[] = ['A', 'B', 'C', 'D'].map((letter, i) => ({
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
          }));
          setColumns(defaultCols);
          setRows(defaultRows);
          // Auto-save defaults
          queueSave(defaultCols, defaultRows);
        } else {
          setColumns(data.columns);
          const loadedRows: RowData[] = data.rows.map(r => {
            const cells: CellData = {};
            data.cells.filter(c => c.rowId === r.id).forEach(c => {
              cells[c.columnId] = c.value || '';
            });
            return { id: r.id, cells };
          });
          setRows(loadedRows.length > 0 ? loadedRows : Array.from({ length: 10 }, () => ({ id: crypto.randomUUID(), cells: {} })));
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
  const doSave = useCallback(async (cols: SpreadsheetColumn[], rws: RowData[]) => {
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
        Object.entries(r.cells).forEach(([colId, val]) => {
          if (val) {
            dbCells.push({ id: crypto.randomUUID(), rowId: r.id, columnId: colId, value: val });
          }
        });
      });

      await saveSpreadsheetData(spreadsheet.id, dbCols, dbRows, dbCells);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('error');
      toast.error('Erro ao salvar. Verifique se as tabelas existem no Supabase.');
    } finally {
      savingRef.current = false;
    }
  }, [spreadsheet.id, saveSpreadsheetData]);

  const queueSave = useCallback((cols: SpreadsheetColumn[], rws: RowData[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => doSave(cols, rws), 1500);
  }, [doSave]);

  // Cell editing
  const startEditCell = (rowId: string, colId: string) => {
    const row = rows.find(r => r.id === rowId);
    setEditValue(row?.cells[colId] || '');
    setEditingCell({ rowId, colId });
  };

  const saveCell = () => {
    if (!editingCell) return;
    const newRows = rows.map(r => {
      if (r.id === editingCell.rowId) {
        return { ...r, cells: { ...r.cells, [editingCell.colId]: editValue } };
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

  // Add column
  const addColumn = () => {
    const letter = String.fromCharCode(65 + columns.length);
    const newCol: SpreadsheetColumn = {
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
    toast.success('Coluna removida');
  };

  // Add row
  const addRow = () => {
    const newRow: RowData = { id: crypto.randomUUID(), cells: {} };
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
      const aVal = a.cells[colId] || '';
      const bVal = b.cells[colId] || '';
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
      ...rows.map(r => columns.map(c => r.cells[c.id] || '')),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, spreadsheet.name);
    XLSX.writeFile(wb, `${spreadsheet.name}.xlsx`);
    toast.success('Exportado com sucesso!');
  };

  // Manual save
  const manualSave = () => {
    doSave(columns, rows);
  };

  // Calculate formula
  const calculateValue = (value: string): string => {
    if (!value.startsWith('=')) return value;
    const formula = value.toUpperCase();

    // =SUM(A1:A10)
    const sumMatch = formula.match(/=SUM\(([A-Z])(\d+):([A-Z])(\d+)\)/);
    if (sumMatch) {
      const [, colLetter, startRow, , endRow] = sumMatch;
      const colIdx = colLetter.charCodeAt(0) - 65;
      const colId = columns[colIdx]?.id;
      if (!colId) return '#ERR';
      let sum = 0;
      for (let i = parseInt(startRow) - 1; i <= parseInt(endRow) - 1 && i < rows.length; i++) {
        const val = parseFloat(rows[i].cells[colId] || '0');
        if (!isNaN(val)) sum += val;
      }
      return sum.toString();
    }

    // =AVG(A1:A10)
    const avgMatch = formula.match(/=AVG\(([A-Z])(\d+):([A-Z])(\d+)\)/);
    if (avgMatch) {
      const [, colLetter, startRow, , endRow] = avgMatch;
      const colIdx = colLetter.charCodeAt(0) - 65;
      const colId = columns[colIdx]?.id;
      if (!colId) return '#ERR';
      let sum = 0, count = 0;
      for (let i = parseInt(startRow) - 1; i <= parseInt(endRow) - 1 && i < rows.length; i++) {
        const val = parseFloat(rows[i].cells[colId] || '');
        if (!isNaN(val)) { sum += val; count++; }
      }
      return count > 0 ? (sum / count).toFixed(2) : '0';
    }

    return value;
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
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg flex-wrap">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />
          Linha
        </Button>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-4 w-4 mr-1" />
          Coluna
        </Button>

        <div className="h-5 w-px bg-border mx-1" />

        <Button variant="outline" size="sm" onClick={exportExcel}>
          <Download className="h-4 w-4 mr-1" />
          Excel
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
            <Button variant="destructive" size="sm" onClick={manualSave}>
              <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-auto bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {/* Row number header */}
              <th className="w-10 min-w-10 border-r border-b text-center text-xs font-medium text-muted-foreground p-2">
                #
              </th>
              {/* Column headers */}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="min-w-[120px] border-r border-b text-left p-0 group"
                  style={{ width: col.width }}
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
                      className="w-full px-2 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border-2 border-primary outline-none"
                    />
                  ) : (
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span
                        className="text-xs font-semibold cursor-text flex-1"
                        onClick={() => startEditColumn(col.id)}
                        title="Clique para editar"
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
                          <DropdownMenuItem onClick={() => startEditColumn(col.id)}>
                            Renomear
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => sortColumn(col.id, 'asc')}>
                            <ArrowUp className="h-4 w-4 mr-2" /> Ordenar A-Z
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => sortColumn(col.id, 'desc')}>
                            <ArrowDown className="h-4 w-4 mr-2" /> Ordenar Z-A
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteColumn(col.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="group/row hover:bg-muted/30">
                {/* Row number */}
                <td className="border-r border-b text-center text-xs text-muted-foreground p-2 bg-muted/20">
                  <div className="flex items-center justify-center">
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
                        <DropdownMenuItem
                          onClick={() => deleteRow(row.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir linha
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
                {/* Cells */}
                {columns.map((col) => (
                  <td key={col.id} className="border-r border-b p-0">
                    {editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveCell}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveCell();
                            // Move to next row
                            const nextRowIndex = rowIndex + 1;
                            if (nextRowIndex < rows.length) {
                              setTimeout(() => startEditCell(rows[nextRowIndex].id, col.id), 50);
                            }
                          }
                          if (e.key === 'Escape') setEditingCell(null);
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            saveCell();
                            // Move to next column
                            const colIndex = columns.findIndex(c => c.id === col.id);
                            const nextColIndex = colIndex + 1;
                            if (nextColIndex < columns.length) {
                              setTimeout(() => startEditCell(row.id, columns[nextColIndex].id), 50);
                            }
                          }
                        }}
                        autoFocus
                        className="w-full h-full px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border-2 border-primary outline-none"
                      />
                    ) : (
                      <div
                        className="w-full h-full px-2 py-1.5 text-sm cursor-cell min-h-[32px] hover:bg-primary/5"
                        onClick={() => startEditCell(row.id, col.id)}
                      >
                        {calculateValue(row.cells[col.id] || '')}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{rows.length} linhas × {columns.length} colunas</span>
        <span>Clique para editar • Enter para próxima linha • Tab para próxima coluna • Fórmulas: =SUM(A1:A10), =AVG(A1:A10)</span>
      </div>
    </div>
  );
}

export default SpreadsheetEditor;

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

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

interface ColData {
  id: string;
  name: string;
  width: number;
}

export interface ClipboardData {
  cells: CellData[][];
  rowCount: number;
  colCount: number;
}

interface UseSpreadsheetClipboardProps {
  rows: RowData[];
  columns: ColData[];
  selectedCell: { rowId: string; colId: string } | null;
  editingCell: { rowId: string; colId: string } | null;
  editingColId: string | null;
}

/**
 * Parse clipboard text (TSV format from Excel/Google Sheets)
 */
function parseClipboardText(text: string): ClipboardData {
  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into rows
  const rowTexts = normalizedText.split('\n');

  // Remove trailing empty row (common when copying from Excel)
  if (rowTexts.length > 0 && rowTexts[rowTexts.length - 1] === '') {
    rowTexts.pop();
  }

  if (rowTexts.length === 0) {
    return { cells: [], rowCount: 0, colCount: 0 };
  }

  const cells: CellData[][] = [];
  let maxCols = 0;

  for (const rowText of rowTexts) {
    // Split by tab (TSV format from Excel/Google Sheets)
    const cellValues = rowText.split('\t');
    maxCols = Math.max(maxCols, cellValues.length);

    const rowCells: CellData[] = cellValues.map(value => ({
      value: value,
    }));

    cells.push(rowCells);
  }

  // Normalize row lengths (pad shorter rows with empty cells)
  for (const row of cells) {
    while (row.length < maxCols) {
      row.push({ value: '' });
    }
  }

  return {
    cells,
    rowCount: cells.length,
    colCount: maxCols,
  };
}

export function useSpreadsheetClipboard({
  rows,
  columns,
  selectedCell,
  editingCell,
  editingColId,
}: UseSpreadsheetClipboardProps) {
  const [copiedData, setCopiedData] = useState<ClipboardData | null>(null);

  /**
   * Copy selected cell to clipboard
   */
  const handleCopy = useCallback(async () => {
    // Don't interfere with text editing
    if (editingCell || editingColId) return;
    if (!selectedCell) return;

    const rowIndex = rows.findIndex(r => r.id === selectedCell.rowId);
    const colIndex = columns.findIndex(c => c.id === selectedCell.colId);

    if (rowIndex < 0 || colIndex < 0) return;

    const row = rows[rowIndex];
    const col = columns[colIndex];
    const cell = row?.cells[col?.id] || { value: '' };

    const clipboardData: ClipboardData = {
      cells: [[{ ...cell }]],
      rowCount: 1,
      colCount: 1,
    };

    setCopiedData(clipboardData);

    // Copy to system clipboard
    try {
      await navigator.clipboard.writeText(cell.value || '');
      toast.success('Copiado!');
    } catch (err) {
      console.warn('Could not copy to system clipboard:', err);
    }
  }, [rows, columns, selectedCell, editingCell, editingColId]);

  /**
   * Paste from clipboard
   */
  const handlePaste = useCallback(async (): Promise<ClipboardData | null> => {
    // Don't interfere with text editing
    if (editingCell || editingColId) return null;
    if (!selectedCell) {
      toast.error('Selecione uma célula primeiro');
      return null;
    }

    // Try to read from system clipboard first (for external paste)
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const externalData = parseClipboardText(text);
        if (externalData.rowCount > 0 && externalData.colCount > 0) {
          return externalData;
        }
      }
    } catch (err) {
      console.warn('Clipboard API not available:', err);
    }

    // Fall back to internal clipboard
    if (copiedData) {
      return copiedData;
    }

    return null;
  }, [copiedData, selectedCell, editingCell, editingColId]);

  return {
    handleCopy,
    handlePaste,
    copiedData,
  };
}

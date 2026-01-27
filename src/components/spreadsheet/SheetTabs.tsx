import { useState } from 'react';
import { Plus, MoreHorizontal, Pencil, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SpreadsheetSheet } from '@/lib/types';

interface SheetTabsProps {
  sheets: SpreadsheetSheet[];
  activeSheetId: string | undefined;
  onSelectSheet: (sheetId: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (sheetId: string, newName: string) => void;
  onDeleteSheet: (sheetId: string) => void;
  onDuplicateSheet: (sheetId: string) => void;
}

export function SheetTabs({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDeleteSheet,
  onDuplicateSheet,
}: SheetTabsProps) {
  const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEditing = (sheet: SpreadsheetSheet) => {
    setEditingSheetId(sheet.id);
    setEditValue(sheet.name);
  };

  const saveEdit = () => {
    if (editingSheetId && editValue.trim()) {
      onRenameSheet(editingSheetId, editValue.trim());
    }
    setEditingSheetId(null);
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-muted/30 border-t overflow-x-auto">
      {sheets.map((sheet) => (
        <div key={sheet.id} className="flex items-center">
          {editingSheetId === sheet.id ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit();
                if (e.key === 'Escape') setEditingSheetId(null);
              }}
              autoFocus
              className="px-3 py-1.5 text-sm border-2 border-primary rounded outline-none min-w-[80px]"
            />
          ) : (
            <button
              onClick={() => onSelectSheet(sheet.id)}
              onDoubleClick={() => startEditing(sheet)}
              className={`px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
                activeSheetId === sheet.id
                  ? 'bg-background border-primary text-foreground font-medium'
                  : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {sheet.name}
            </button>
          )}

          {activeSheetId === sheet.id && sheets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded ml-0.5">
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => startEditing(sheet)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicateSheet(sheet.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                {sheets.length > 1 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteSheet(sheet.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={onAddSheet}
        className="h-8 w-8 p-0 ml-1"
        title="Adicionar planilha"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default SheetTabs;

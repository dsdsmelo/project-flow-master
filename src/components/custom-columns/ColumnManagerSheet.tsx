import { useState, useCallback } from 'react';
import { Plus, Edit, Trash2, GripVertical, X, Settings2, Flag, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useData } from '@/contexts/DataContext';
import { CustomColumn } from '@/lib/types';
import { StandardColumn } from '@/hooks/useColumnSettings';
import { cn } from '@/lib/utils';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

interface ColumnManagerSheetProps {
  projectId: string;
  trigger?: React.ReactNode;
  standardColumns?: StandardColumn[];
  onToggleStandardColumn?: (columnId: string) => void;
  onUpdateStandardColumnName?: (columnId: string, name: string) => void;
  onReorderStandardColumns?: (draggedId: string, targetId: string) => void;
  onResetStandardColumns?: () => void;
}

const typeLabels: Record<CustomColumn['type'], string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  list: 'Lista',
  percentage: 'Porcentagem',
  user: 'Usuário',
};

export const ColumnManagerSheet = ({ 
  projectId, 
  trigger,
  standardColumns = [],
  onToggleStandardColumn,
  onUpdateStandardColumnName,
  onReorderStandardColumns,
  onResetStandardColumns,
}: ColumnManagerSheetProps) => {
  const { customColumns, setCustomColumns, addCustomColumn, updateCustomColumn, projects } = useData();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [editingStandardId, setEditingStandardId] = useState<string | null>(null);
  const [editingStandardName, setEditingStandardName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as CustomColumn['type'],
    options: [] as string[],
    newOption: '',
    isMilestone: false,
  });

  const project = projects.find(p => p.id === projectId);

  const projectColumns = customColumns
    .filter(col => col.projectId === projectId && col.active)
    .sort((a, b) => a.order - b.order);

  const resetForm = () => {
    setFormData({ name: '', type: 'text', options: [], newOption: '', isMilestone: false });
    setEditingColumn(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (column: CustomColumn) => {
    setEditingColumn(column);
    setFormData({
      name: column.name,
      type: column.type,
      options: column.options || [],
      newOption: '',
      isMilestone: column.isMilestone || false,
    });
    setIsDialogOpen(true);
  };

  const handleAddOption = () => {
    if (formData.newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, prev.newOption.trim()],
        newOption: '',
      }));
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingColumn) {
        await updateCustomColumn(editingColumn.id, {
          name: formData.name,
          type: formData.type,
          options: formData.options,
          isMilestone: formData.isMilestone,
        });
      } else {
        await addCustomColumn({
          name: formData.name,
          type: formData.type,
          projectId,
          order: projectColumns.length + 1,
          options: formData.type === 'list' ? formData.options : undefined,
          isMilestone: formData.isMilestone,
          active: true,
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving custom column:', err);
    }
  };

  const handleDelete = async (columnId: string) => {
    try {
      await updateCustomColumn(columnId, { active: false });
    } catch (err) {
      console.error('Error deleting custom column:', err);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggedId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (columnId !== draggedId) {
      setDragOverId(columnId);
    }
  }, [draggedId]);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = projectColumns.findIndex(col => col.id === draggedId);
    const targetIndex = projectColumns.findIndex(col => col.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newColumns = [...projectColumns];
    const [removed] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, removed);

    // Update local state immediately for responsiveness
    setCustomColumns(prev => {
      const updated = [...prev];
      newColumns.forEach((col, index) => {
        const idx = updated.findIndex(c => c.id === col.id);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], order: index + 1 };
        }
      });
      return updated;
    });

    // Persist to database
    try {
      await Promise.all(
        newColumns.map((col, index) => updateCustomColumn(col.id, { order: index + 1 }))
      );
    } catch (err) {
      console.error('Error updating column order:', err);
    }

    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, projectColumns, setCustomColumns, updateCustomColumn]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
  }, []);

  // Standard column drag handlers
  const handleStandardDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggedId(`std-${columnId}`);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `std-${columnId}`);
  }, []);

  const handleStandardDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (`std-${columnId}` !== draggedId) {
      setDragOverId(`std-${columnId}`);
    }
  }, [draggedId]);

  const handleStandardDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedId || !draggedId.startsWith('std-')) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const sourceId = draggedId.replace('std-', '');
    if (sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    onReorderStandardColumns?.(sourceId, targetId);
    setDraggedId(null);
    setDragOverId(null);
  }, [draggedId, onReorderStandardColumns]);

  const startEditingStandard = (columnId: string, name: string) => {
    setEditingStandardId(columnId);
    setEditingStandardName(name);
  };

  const saveStandardName = () => {
    if (editingStandardId && editingStandardName.trim()) {
      onUpdateStandardColumnName?.(editingStandardId, editingStandardName.trim());
    }
    setEditingStandardId(null);
    setEditingStandardName('');
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Settings2 className="w-4 h-4 mr-2" />
              Gerenciar Colunas
            </Button>
          )}
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Gerenciar Colunas</SheetTitle>
            <SheetDescription>
              {project ? `Projeto: ${project.name}` : 'Selecione um projeto para gerenciar colunas'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 max-h-[calc(100vh-180px)] overflow-y-auto pr-2">
            {/* Standard Columns Section */}
            {standardColumns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Colunas Padrão</h4>
                    <p className="text-xs text-muted-foreground">Arraste para reordenar, clique no olho para ocultar</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={onResetStandardColumns} title="Restaurar padrões">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {standardColumns.sort((a, b) => a.order - b.order).map((column, index) => (
                    <div 
                      key={column.id}
                      draggable
                      onDragStart={(e) => handleStandardDragStart(e, column.id)}
                      onDragOver={(e) => handleStandardDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleStandardDrop(e, column.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border transition-all duration-200",
                        draggedId === `std-${column.id}` && "opacity-50 scale-[0.98]",
                        dragOverId === `std-${column.id}` && "border-primary border-2 bg-primary/5",
                        !column.visible && "opacity-60"
                      )}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono w-5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingStandardId === column.id ? (
                          <Input
                            value={editingStandardName}
                            onChange={(e) => setEditingStandardName(e.target.value)}
                            onBlur={saveStandardName}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                saveStandardName();
                              } else if (e.key === 'Escape') {
                                setEditingStandardId(null);
                                setEditingStandardName('');
                              }
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className={cn(
                              "font-medium truncate block cursor-text",
                              !column.visible && "line-through text-muted-foreground"
                            )}
                            onClick={() => startEditingStandard(column.id, column.name)}
                          >
                            {column.name}
                          </span>
                        )}
                        <Badge variant="outline" className="text-xs mt-0.5">
                          Padrão
                        </Badge>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onToggleStandardColumn?.(column.id)}
                        className="flex-shrink-0"
                        title={column.visible ? 'Ocultar coluna' : 'Mostrar coluna'}
                      >
                        {column.visible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      {column.canDelete && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => onToggleStandardColumn?.(column.id)}
                          title="Ocultar coluna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Custom Columns Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Colunas Customizadas</h4>
                  <p className="text-xs text-muted-foreground">Campos extras para este projeto</p>
                </div>
                <Button onClick={openCreateDialog} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Coluna
                </Button>
              </div>

              {projectColumns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium text-sm">Nenhuma coluna customizada</p>
                  <p className="text-xs mt-1">Adicione campos extras para este projeto</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projectColumns.map((column, index) => (
                    <div 
                      key={column.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, column.id)}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, column.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border transition-all duration-200",
                        draggedId === column.id && "opacity-50 scale-[0.98]",
                        dragOverId === column.id && "border-primary border-2 bg-primary/5"
                      )}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing flex-shrink-0" />
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono w-5 flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{column.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs">
                            {typeLabels[column.type]}
                          </Badge>
                          {column.isMilestone && (
                            <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                              Marco
                            </Badge>
                          )}
                          {column.type === 'list' && column.options && (
                            <span className="text-xs text-muted-foreground">
                              {column.options.length} opções
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(column)} className="flex-shrink-0">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        onClick={() => handleDelete(column.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Editar Coluna' : 'Nova Coluna Customizada'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Coluna</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Custo Estimado"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as CustomColumn['type'] }))}
                disabled={!!editingColumn}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="number">Número</SelectItem>
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="list">Lista de Opções</SelectItem>
                  <SelectItem value="percentage">Porcentagem</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
              {editingColumn && (
                <p className="text-xs text-muted-foreground">O tipo não pode ser alterado após a criação</p>
              )}
            </div>

            {formData.type === 'list' && (
              <div className="space-y-2">
                <Label>Opções da Lista</Label>
                <div className="flex gap-2">
                  <Input
                    value={formData.newOption}
                    onChange={(e) => setFormData(prev => ({ ...prev, newOption: e.target.value }))}
                    placeholder="Adicionar opção..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  />
                  <Button type="button" onClick={handleAddOption} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.options.map((option, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {option}
                        <button onClick={() => handleRemoveOption(index)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="isMilestoneSheet"
                checked={formData.isMilestone}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isMilestone: !!checked }))}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="isMilestoneSheet"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <Flag className="w-4 h-4 text-amber-500" />
                  Marcar como Marco (Milestone)
                </label>
                <p className="text-xs text-muted-foreground">
                  Marcos são pontos importantes no cronograma do projeto
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingColumn ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

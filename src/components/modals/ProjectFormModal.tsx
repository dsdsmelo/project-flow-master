import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { Project, CustomColumn } from '@/lib/types';
import { toast } from 'sonner';
import { Info, Columns3, Plus, Edit, Trash2, GripVertical, X, Flag } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

const typeLabels: Record<CustomColumn['type'], string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  list: 'Lista',
  percentage: 'Porcentagem',
  user: 'Usuário',
};

export function ProjectFormModal({ open, onOpenChange, project }: ProjectFormModalProps) {
  const { addProject, updateProject, customColumns, addCustomColumn, updateCustomColumn, setCustomColumns } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProjectId, setNewProjectId] = useState<string | null>(null);
  
  // Custom columns state
  const [isColumnDialogOpen, setIsColumnDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CustomColumn | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [columnFormData, setColumnFormData] = useState({
    name: '',
    type: 'text' as CustomColumn['type'],
    options: [] as string[],
    newOption: '',
    isMilestone: false,
  });

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'planning',
    },
  });

  // Get the effective project ID (existing project or newly created)
  const effectiveProjectId = project?.id || newProjectId;

  // Get columns for this project
  const projectColumns = effectiveProjectId 
    ? customColumns.filter(col => col.projectId === effectiveProjectId && col.active).sort((a, b) => a.order - b.order)
    : [];

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        status: project.status,
      });
      setNewProjectId(null);
    } else {
      form.reset({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planning',
      });
      setNewProjectId(null);
    }
  }, [project, form, open]);

  // Column management functions
  const resetColumnForm = () => {
    setColumnFormData({ name: '', type: 'text', options: [], newOption: '', isMilestone: false });
    setEditingColumn(null);
  };

  const openCreateColumnDialog = () => {
    resetColumnForm();
    setIsColumnDialogOpen(true);
  };

  const openEditColumnDialog = (column: CustomColumn) => {
    setEditingColumn(column);
    setColumnFormData({
      name: column.name,
      type: column.type,
      options: column.options || [],
      newOption: '',
      isMilestone: column.isMilestone || false,
    });
    setIsColumnDialogOpen(true);
  };

  const handleAddOption = () => {
    if (columnFormData.newOption.trim()) {
      setColumnFormData(prev => ({
        ...prev,
        options: [...prev.options, prev.newOption.trim()],
        newOption: '',
      }));
    }
  };

  const handleRemoveOption = (index: number) => {
    setColumnFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSaveColumn = async () => {
    if (!columnFormData.name.trim() || !effectiveProjectId) return;

    try {
      if (editingColumn) {
        await updateCustomColumn(editingColumn.id, {
          name: columnFormData.name,
          type: columnFormData.type,
          options: columnFormData.options,
          isMilestone: columnFormData.isMilestone,
        });
        toast.success('Coluna atualizada!');
      } else {
        await addCustomColumn({
          name: columnFormData.name,
          type: columnFormData.type,
          projectId: effectiveProjectId,
          order: projectColumns.length + 1,
          options: columnFormData.type === 'list' ? columnFormData.options : undefined,
          isMilestone: columnFormData.isMilestone,
          active: true,
        });
        toast.success('Coluna criada!');
      }

      setIsColumnDialogOpen(false);
      resetColumnForm();
    } catch (err) {
      console.error('Error saving custom column:', err);
      toast.error('Erro ao salvar coluna');
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      await updateCustomColumn(columnId, { active: false });
      toast.success('Coluna removida!');
    } catch (err) {
      console.error('Error deleting custom column:', err);
      toast.error('Erro ao remover coluna');
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

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const projectData = {
        name: data.name,
        description: data.description || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        status: data.status,
      };

      if (project) {
        await updateProject(project.id, projectData);
        toast.success('Projeto atualizado com sucesso!');
        onOpenChange(false);
      } else {
        // Create new project and keep modal open for column configuration
        const newProject = await addProject(projectData);
        setNewProjectId(newProject.id);
        toast.success('Projeto criado! Adicione pelo menos uma coluna.');
      }
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Erro ao salvar projeto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Require at least one column for new projects
    if (newProjectId && projectColumns.length === 0) {
      toast.error('Adicione pelo menos uma coluna antes de concluir.');
      return;
    }
    setNewProjectId(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {project ? 'Editar Projeto' : newProjectId ? 'Configurar Projeto' : 'Novo Projeto'}
            </DialogTitle>
            <DialogDescription>
              {project 
                ? 'Atualize as informações do projeto' 
                : newProjectId 
                  ? 'Adicione colunas personalizadas para controlar suas tarefas'
                  : 'Preencha os dados para criar um novo projeto'
              }
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue={newProjectId ? "columns" : "info"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Informações
              </TabsTrigger>
              <TabsTrigger value="columns" className="flex items-center gap-2" disabled={!effectiveProjectId}>
                <Columns3 className="w-4 h-4" />
                Colunas
              </TabsTrigger>
            </TabsList>

            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
              <TabsContent value="info" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Nome do projeto"
                    disabled={!!newProjectId}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    {...form.register('description')}
                    placeholder="Descrição do projeto"
                    rows={3}
                    disabled={!!newProjectId}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(value: ProjectFormData['status']) => form.setValue('status', value)}
                    disabled={!!newProjectId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planejamento</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...form.register('startDate')}
                      disabled={!!newProjectId}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Fim</Label>
                    <Input
                      id="endDate"
                      type="date"
                      {...form.register('endDate')}
                      disabled={!!newProjectId}
                    />
                  </div>
                </div>

                {!newProjectId && (
                  <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="gradient-primary text-white">
                      {isSubmitting ? 'Salvando...' : project ? 'Atualizar' : 'Criar Projeto'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="columns" className="space-y-4">
                {newProjectId && projectColumns.length === 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-700 dark:text-amber-400">
                    <strong>Obrigatório:</strong> Adicione pelo menos uma coluna para concluir a criação do projeto.
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Colunas personalizadas aparecem no formulário e tabela de tarefas.
                  </p>
                  <Button type="button" onClick={openCreateColumnDialog} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Coluna
                  </Button>
                </div>

                {projectColumns.length === 0 ? (
                  <div className={cn(
                    "text-center py-12 text-muted-foreground border border-dashed rounded-lg",
                    newProjectId && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/10"
                  )}>
                    <Columns3 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhuma coluna configurada</p>
                    <p className="text-sm mt-1">
                      {newProjectId 
                        ? 'Clique em "Nova Coluna" para adicionar sua primeira coluna'
                        : 'Adicione colunas para personalizar suas tarefas'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
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
                        <Button type="button" variant="ghost" size="sm" onClick={() => openEditColumnDialog(column)} className="flex-shrink-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive flex-shrink-0"
                          onClick={() => handleDeleteColumn(column.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  <strong>Tipos disponíveis:</strong> Texto, Número, Data, Lista de Opções, Porcentagem, Usuário
                </div>

                {newProjectId && (
                  <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <Button 
                      type="button" 
                      onClick={handleClose}
                      disabled={projectColumns.length === 0}
                      className="gradient-primary text-white"
                    >
                      Concluir
                    </Button>
                  </div>
                )}
              </TabsContent>

              {project && (
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="gradient-primary text-white">
                    {isSubmitting ? 'Salvando...' : 'Atualizar'}
                  </Button>
                </div>
              )}
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Custom Column Dialog */}
      <Dialog open={isColumnDialogOpen} onOpenChange={setIsColumnDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Editar Coluna' : 'Nova Coluna'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="columnName">Nome da Coluna</Label>
              <Input
                id="columnName"
                value={columnFormData.name}
                onChange={(e) => setColumnFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Custo Estimado"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={columnFormData.type} 
                onValueChange={(v) => setColumnFormData(prev => ({ ...prev, type: v as CustomColumn['type'] }))}
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

            {columnFormData.type === 'list' && (
              <div className="space-y-2">
                <Label>Opções da Lista</Label>
                <div className="flex gap-2">
                  <Input
                    value={columnFormData.newOption}
                    onChange={(e) => setColumnFormData(prev => ({ ...prev, newOption: e.target.value }))}
                    placeholder="Adicionar opção..."
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  />
                  <Button type="button" onClick={handleAddOption} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {columnFormData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {columnFormData.options.map((option, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {option}
                        <button type="button" onClick={() => handleRemoveOption(index)} className="ml-1 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
              </div>
            )}

            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="isMilestone"
                checked={columnFormData.isMilestone}
                onCheckedChange={(checked) => setColumnFormData(prev => ({ ...prev, isMilestone: !!checked }))}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="isMilestone"
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
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsColumnDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveColumn} disabled={!columnFormData.name.trim()}>
              {editingColumn ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

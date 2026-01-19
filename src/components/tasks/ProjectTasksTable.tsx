import { useState, useMemo, useCallback } from 'react';
import { 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Columns3,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { InlineEditCell } from '@/components/custom-columns/InlineEditCell';
import { TaskProgressEditCell } from '@/components/custom-columns/TaskProgressEditCell';
import { 
  StatusEditCell, 
  PriorityEditCell, 
  ResponsibleEditCell, 
  TextEditCell,
  DateEditCell
} from '@/components/tasks/InlineTaskFieldEdit';
import { ColumnManagerSheet } from '@/components/custom-columns/ColumnManagerSheet';
import { TaskFormModal } from '@/components/modals/TaskFormModal';
import { useData } from '@/contexts/DataContext';
import { calculatePercentage, isTaskOverdue } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Task } from '@/lib/types';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectTasksTableProps {
  projectId: string;
  onOpenNewTask?: () => void;
}

export const ProjectTasksTable = ({ projectId, onOpenNewTask }: ProjectTasksTableProps) => {
  const { tasks, updateTask, deleteTask, phases, people, customColumns } = useData();
  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    responsible: 'all',
    phase: 'all',
  });
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Filter tasks for this project
  const projectTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks, projectId]);


  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return projectTasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filters.status === 'all' || task.status === filters.status;
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      const matchesResponsible = filters.responsible === 'all' || task.responsibleId === filters.responsible;
      const matchesPhase = filters.phase === 'all' || task.phaseId === filters.phase;
      return matchesSearch && matchesStatus && matchesPriority && matchesResponsible && matchesPhase;
    });
  }, [projectTasks, search, filters]);

  // Custom columns for this project
  const displayedCustomColumns = useMemo(() => {
    return customColumns
      .filter(col => col.projectId === projectId && col.active)
      .sort((a, b) => a.order - b.order);
  }, [customColumns, projectId]);

  const getPerson = (personId?: string) => {
    if (!personId) return null;
    return people.find(p => p.id === personId);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleAllTasks = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map(t => t.id));
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;

  // Handler to update custom column value
  const handleCustomValueChange = useCallback(async (taskId: string, columnId: string, value: string | number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    try {
      await updateTask(taskId, {
        customValues: {
          ...task.customValues,
          [columnId]: value,
        },
      });
    } catch (err) {
      console.error('Error updating custom value:', err);
    }
  }, [tasks, updateTask]);

  // Handler to update task progress
  const handleProgressUpdate = useCallback(async (taskId: string, progress: number) => {
    try {
      await updateTask(taskId, { quantity: 100, collected: progress });
      toast.success('Progresso atualizado!');
    } catch (err) {
      console.error('Error updating progress:', err);
      toast.error('Erro ao atualizar progresso');
    }
  }, [updateTask]);

  // Handler to update any task field
  const handleTaskFieldUpdate = useCallback(async (taskId: string, field: Partial<Task>) => {
    try {
      await updateTask(taskId, field);
    } catch (err) {
      console.error('Error updating task field:', err);
      toast.error('Erro ao atualizar tarefa');
    }
  }, [updateTask]);

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    try {
      await deleteTask(taskToDelete);
      toast.success('Tarefa excluída com sucesso!');
    } catch (err) {
      console.error('Error deleting task:', err);
      toast.error('Erro ao excluir tarefa');
    } finally {
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const clearFilters = () => {
    setFilters({ status: 'all', priority: 'all', responsible: 'all', phase: 'all' });
    setSearch('');
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full lg:w-auto flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="in_progress">Em Progresso</SelectItem>
              <SelectItem value="blocked">Bloqueado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>


          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros Avançados</SheetTitle>
                <SheetDescription>
                  Refine a lista de tarefas usando os filtros abaixo
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridade</label>
                  <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsável</label>
                  <Select value={filters.responsible} onValueChange={(v) => setFilters(f => ({ ...f, responsible: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {people.filter(p => p.active).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-2 flex-wrap">
          <ColumnManagerSheet 
            projectId={projectId}
            trigger={
              <Button variant="outline">
                <Columns3 className="w-4 h-4 mr-2" />
                Colunas
              </Button>
            }
          />

          {selectedTasks.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Ações em Lote ({selectedTasks.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Alterar Status</DropdownMenuItem>
                <DropdownMenuItem>Alterar Responsável</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">Excluir Selecionados</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {onOpenNewTask && (
            <Button className="gradient-primary text-white" onClick={onOpenNewTask}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-4 px-4 w-12">
                  <Checkbox
                    checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                    onCheckedChange={toggleAllTasks}
                  />
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Tarefa</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Descrição</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Responsável</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Prioridade</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Início</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Fim</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground w-40">Progresso</th>
                {/* Custom Columns Headers */}
                {displayedCustomColumns.map(col => (
                  <th key={col.id} className="text-left py-4 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {col.name}
                  </th>
                ))}
                <th className="text-right py-4 px-4 text-sm font-medium text-muted-foreground w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => {
                const person = getPerson(task.responsibleId);
                const progress = calculatePercentage(task);
                const overdue = isTaskOverdue(task);

                return (
                  <tr 
                    key={task.id} 
                    className={cn(
                      "border-t border-border hover:bg-muted/30 transition-colors",
                      overdue && "bg-status-blocked/5",
                      selectedTasks.includes(task.id) && "bg-primary/5"
                    )}
                  >
                    <td className="py-4 px-4">
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => toggleTaskSelection(task.id)}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <TextEditCell
                        value={task.name}
                        isOverdue={overdue}
                        onSave={(value) => handleTaskFieldUpdate(task.id, { name: value })}
                      />
                    </td>
                    <td className="py-4 px-4 max-w-[200px]">
                      <TextEditCell
                        value={task.description || ''}
                        placeholder="Adicionar descrição..."
                        onSave={(value) => handleTaskFieldUpdate(task.id, { description: value || undefined })}
                        className="text-muted-foreground"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <ResponsibleEditCell
                        responsibleId={task.responsibleId}
                        people={people}
                        onSave={(value) => handleTaskFieldUpdate(task.id, { responsibleId: value })}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <StatusEditCell
                        status={task.status}
                        onSave={(value) => handleTaskFieldUpdate(task.id, { status: value })}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <PriorityEditCell
                        priority={task.priority}
                        onSave={(value) => handleTaskFieldUpdate(task.id, { priority: value })}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <DateEditCell
                        value={task.startDate}
                        placeholder="Definir"
                        onSave={(value) => handleTaskFieldUpdate(task.id, { startDate: value })}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <DateEditCell
                        value={task.endDate}
                        placeholder="Definir"
                        onSave={(value) => handleTaskFieldUpdate(task.id, { endDate: value })}
                      />
                    </td>
                    <td className="py-4 px-4">
                      <TaskProgressEditCell
                        progress={progress}
                        onSave={(value) => handleProgressUpdate(task.id, value)}
                      />
                    </td>
                    {/* Custom Columns Values - Inline Editable */}
                    {displayedCustomColumns.map(col => (
                      <td key={col.id} className="py-3 px-4">
                        <InlineEditCell
                          column={col}
                          value={task.customValues?.[col.id]}
                          onSave={(value) => handleCustomValueChange(task.id, col.id, value)}
                        />
                      </td>
                    ))}
                    <td className="py-4 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTask(task)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(task.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
            <p className="text-muted-foreground mb-4">Tente ajustar os filtros ou criar uma nova tarefa.</p>
            {onOpenNewTask && (
              <Button className="gradient-primary text-white" onClick={onOpenNewTask}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Footer with count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Mostrando {filteredTasks.length} de {projectTasks.length} tarefas
        </span>
      </div>

      {/* Task Form Modal for editing */}
      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        defaultProjectId={projectId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

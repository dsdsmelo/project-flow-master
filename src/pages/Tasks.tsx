import { useState, useMemo, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Columns3
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { InlineEditCell } from '@/components/custom-columns/InlineEditCell';
import { TaskProgressEditCell } from '@/components/custom-columns/TaskProgressEditCell';
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

const Tasks = () => {
  const { tasks, updateTask, deleteTask, projects, phases, people, customColumns, loading, error } = useData();
  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    project: 'all',
    status: 'all',
    priority: 'all',
    responsible: 'all',
  });
  
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase());
      const matchesProject = filters.project === 'all' || task.projectId === filters.project;
      const matchesStatus = filters.status === 'all' || task.status === filters.status;
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      const matchesResponsible = filters.responsible === 'all' || task.responsibleId === filters.responsible;
      return matchesSearch && matchesProject && matchesStatus && matchesPriority && matchesResponsible;
    });
  }, [tasks, search, filters]);

  // Get custom columns for the selected project (or all if no project selected)
  // Columns are automatically displayed based on project selection
  const displayedCustomColumns = useMemo(() => {
    if (filters.project !== 'all') {
      return customColumns
        .filter(col => col.projectId === filters.project && col.active)
        .sort((a, b) => a.order - b.order);
    }
    // When viewing all projects, don't show custom columns (they are project-specific)
    return [];
  }, [customColumns, filters.project]);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || '-';
  };

  const getPhaseName = (phaseId?: string) => {
    if (!phaseId) return '-';
    return phases.find(p => p.id === phaseId)?.name || '-';
  };

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

  // Handler to update task progress (quantity & collected)
  const handleProgressUpdate = useCallback(async (taskId: string, quantity: number, collected: number) => {
    try {
      await updateTask(taskId, { quantity, collected });
      toast.success('Progresso atualizado!');
    } catch (err) {
      console.error('Error updating progress:', err);
      toast.error('Erro ao atualizar progresso');
    }
  }, [updateTask]);

  const handleOpenNewTask = () => {
    setEditingTask(undefined);
    setTaskModalOpen(true);
  };

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

  if (loading) {
    return (
      <MainLayout>
        <Header title="Tarefas" subtitle="Gerencie e acompanhe todas as tarefas" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <Header title="Tarefas" subtitle="Gerencie e acompanhe todas as tarefas" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-destructive">
            <p className="font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header title="Tarefas" subtitle="Gerencie e acompanhe todas as tarefas" />
      
      <div className="p-6 space-y-6">
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
            
            <Select value={filters.project} onValueChange={(v) => setFilters(f => ({ ...f, project: v }))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                    onClick={() => setFilters({ project: 'all', status: 'all', priority: 'all', responsible: 'all' })}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Column Manager - Only show when a project is selected */}
            {filters.project !== 'all' && (
              <ColumnManagerSheet 
                projectId={filters.project}
                trigger={
                  <Button variant="outline" className="relative">
                    <Columns3 className="w-4 h-4 mr-2" />
                    Colunas
                    {displayedCustomColumns.length > 0 && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                        {displayedCustomColumns.length}
                      </span>
                    )}
                  </Button>
                }
              />
            )}

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
            <Button className="gradient-primary text-white" onClick={handleOpenNewTask}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
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
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Projeto</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Fase</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Responsável</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Prioridade</th>
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
                        <div>
                          <p className={cn("font-medium", overdue && "text-status-blocked")}>
                            {task.name}
                          </p>
                          {task.observation && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                              {task.observation}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {getProjectName(task.projectId)}
                      </td>
                      <td className="py-4 px-4 text-sm text-muted-foreground">
                        {getPhaseName(task.phaseId)}
                      </td>
                      <td className="py-4 px-4">
                        {person ? (
                          <div className="flex items-center gap-2">
                            <AvatarCircle name={person.name} color={person.color} size="sm" />
                            <span className="text-sm">{person.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-4 px-4">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="py-4 px-4">
                        <TaskProgressEditCell
                          quantity={task.quantity}
                          collected={task.collected}
                          progress={progress}
                          onSave={(quantity, collected) => handleProgressUpdate(task.id, quantity, collected)}
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
              <Button className="gradient-primary text-white" onClick={handleOpenNewTask}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            </div>
          )}
        </div>

        {/* Footer with count */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Mostrando {filteredTasks.length} de {tasks.length} tarefas
          </span>
        </div>
      </div>

      {/* Task Form Modal */}
      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        task={editingTask}
        defaultProjectId={filters.project !== 'all' ? filters.project : undefined}
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
    </MainLayout>
  );
};

export default Tasks;

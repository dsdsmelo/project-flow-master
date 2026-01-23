import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Columns3,
  GripVertical,
  X,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { TablePagination } from '@/components/ui/table-pagination';
import { useData } from '@/contexts/DataContext';
import { calculatePercentage, isTaskOverdue } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Task, CustomColumn } from '@/lib/types';
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
}

export const ProjectTasksTable = ({ projectId }: ProjectTasksTableProps) => {
  const { tasks, addTask, updateTask, deleteTask, people, customColumns, updateCustomColumn, setCustomColumns } = useData();

  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    responsible: 'all',
  });

  // Toggle to show/hide completed tasks (hidden by default to reduce visual clutter)
  const [showCompleted, setShowCompleted] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Column editing and drag state
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const columnInputRef = useRef<HTMLInputElement>(null);

  // Filter tasks for this project
  const projectTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks, projectId]);

  // Get all columns for this project (unified - no distinction)
  const projectColumns = useMemo(() => {
    return customColumns
      .filter(col => col.projectId === projectId && col.active && !col.hidden)
      .sort((a, b) => a.order - b.order);
  }, [customColumns, projectId]);

  // Count completed tasks for display
  const completedTasksCount = useMemo(() => {
    return projectTasks.filter(t => t.status === 'completed').length;
  }, [projectTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return projectTasks.filter(task => {
      // Hide completed tasks if toggle is off
      if (!showCompleted && task.status === 'completed') return false;

      const matchesSearch = task.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filters.status === 'all' || task.status === filters.status;
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      const matchesResponsible = filters.responsible === 'all' || task.responsibleId === filters.responsible;
      return matchesSearch && matchesStatus && matchesPriority && matchesResponsible;
    });
  }, [projectTasks, search, filters, showCompleted]);

  // Paginated tasks
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredTasks.slice(start, end);
  }, [filteredTasks, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTasks.length / pageSize);

  // Reset to page 1 when filters change
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const handleShowCompletedToggle = useCallback(() => {
    setShowCompleted(prev => !prev);
    setCurrentPage(1);
  }, []);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const toggleAllTasks = () => {
    if (selectedTasks.length === paginatedTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(paginatedTasks.map(t => t.id));
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length + (showCompleted ? 0 : 1);

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

  const handleDuplicateTask = async (task: Task) => {
    try {
      const { id, updatedAt, ...taskData } = task;
      await addTask({
        ...taskData,
        name: `${task.name} (cópia)`,
        status: 'pending',
        collected: 0,
      });
      toast.success('Tarefa duplicada com sucesso!');
    } catch (err) {
      console.error('Error duplicating task:', err);
      toast.error('Erro ao duplicar tarefa');
    }
  };

  const clearFilters = () => {
    setFilters({ status: 'all', priority: 'all', responsible: 'all' });
    setSearch('');
    setShowCompleted(true);
    setCurrentPage(1);
  };

  // Column inline editing handlers
  const startEditingColumn = useCallback((columnId: string, currentName: string) => {
    setEditingColumnId(columnId);
    setEditingColumnName(currentName);
    setTimeout(() => columnInputRef.current?.focus(), 0);
  }, []);

  const saveColumnName = useCallback(async () => {
    if (!editingColumnId || !editingColumnName.trim()) {
      setEditingColumnId(null);
      setEditingColumnName('');
      return;
    }

    try {
      await updateCustomColumn(editingColumnId, { name: editingColumnName.trim() });
    } catch (err) {
      console.error('Error updating column name:', err);
      toast.error('Erro ao atualizar nome da coluna');
    } finally {
      setEditingColumnId(null);
      setEditingColumnName('');
    }
  }, [editingColumnId, editingColumnName, updateCustomColumn]);

  const cancelEditingColumn = useCallback(() => {
    setEditingColumnId(null);
    setEditingColumnName('');
  }, []);

  // Column drag-and-drop handlers
  const handleColumnDragStart = useCallback((e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  }, []);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (columnId !== draggedColumnId) {
      setDragOverColumnId(columnId);
    }
  }, [draggedColumnId]);

  const handleColumnDragLeave = useCallback(() => {
    setDragOverColumnId(null);
  }, []);

  const handleColumnDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();

    if (!draggedColumnId || draggedColumnId === targetId) {
      setDraggedColumnId(null);
      setDragOverColumnId(null);
      return;
    }

    const draggedIndex = projectColumns.findIndex(col => col.id === draggedColumnId);
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
      toast.error('Erro ao reordenar colunas');
    }

    setDraggedColumnId(null);
    setDragOverColumnId(null);
  }, [draggedColumnId, projectColumns, setCustomColumns, updateCustomColumn]);

  const handleColumnDragEnd = useCallback(() => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  }, []);

  // Render cell content based on column type
  const renderCellContent = (task: Task, column: CustomColumn) => {
    const progress = calculatePercentage(task);
    const overdue = isTaskOverdue(task);

    // Standard field columns
    if (column.standardField) {
      switch (column.standardField) {
        case 'name':
          return (
            <TextEditCell
              value={task.name}
              isOverdue={overdue}
              onSave={(value) => handleTaskFieldUpdate(task.id, { name: value })}
            />
          );
        case 'description':
          return (
            <TextEditCell
              value={task.description || ''}
              placeholder="Adicionar descrição..."
              onSave={(value) => handleTaskFieldUpdate(task.id, { description: value || undefined })}
              className="text-muted-foreground"
            />
          );
        case 'responsible':
          return (
            <ResponsibleEditCell
              responsibleId={task.responsibleId}
              people={people}
              onSave={(value) => handleTaskFieldUpdate(task.id, { responsibleId: value })}
            />
          );
        case 'status':
          return (
            <StatusEditCell
              status={task.status}
              onSave={(value) => handleTaskFieldUpdate(task.id, { status: value })}
            />
          );
        case 'priority':
          return (
            <PriorityEditCell
              priority={task.priority}
              onSave={(value) => handleTaskFieldUpdate(task.id, { priority: value })}
            />
          );
        case 'startDate':
          return (
            <DateEditCell
              value={task.startDate}
              placeholder="Definir"
              onSave={(value) => handleTaskFieldUpdate(task.id, { startDate: value })}
            />
          );
        case 'endDate':
          return (
            <DateEditCell
              value={task.endDate}
              placeholder="Definir"
              onSave={(value) => handleTaskFieldUpdate(task.id, { endDate: value })}
            />
          );
        case 'progress':
          return (
            <TaskProgressEditCell
              progress={progress}
              onSave={(value) => handleProgressUpdate(task.id, value)}
            />
          );
        default:
          return null;
      }
    }

    // Custom column
    return (
      <InlineEditCell
        column={column}
        value={task.customValues?.[column.id]}
        onSave={(value) => handleCustomValueChange(task.id, column.id, value)}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full lg:w-auto flex-wrap">
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <Select
            value={filters.status}
            onValueChange={(v) => handleFilterChange({ ...filters, status: v })}
          >
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

          {/* Toggle Completed Tasks */}
          <Button
            variant={showCompleted ? "outline" : "secondary"}
            onClick={handleShowCompletedToggle}
            className="gap-2"
            title={showCompleted ? "Ocultar tarefas concluídas" : "Mostrar tarefas concluídas"}
          >
            {showCompleted ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Concluídas</span>
            {completedTasksCount > 0 && (
              <Badge variant={showCompleted ? "secondary" : "default"} className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs">
                {completedTasksCount}
              </Badge>
            )}
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="w-4 h-4 mr-2" />
                Filtros
                {activeFiltersCount > 0 && (
                  <Badge variant="default" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFiltersCount}
                  </Badge>
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
                  <Select
                    value={filters.priority}
                    onValueChange={(v) => handleFilterChange({ ...filters, priority: v })}
                  >
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
                  <Select
                    value={filters.responsible}
                    onValueChange={(v) => handleFilterChange({ ...filters, responsible: v })}
                  >
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

          {/* Active filters badges */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {!showCompleted && (
                <Badge variant="secondary" className="gap-1">
                  <EyeOff className="w-3 h-3" />
                  Concluídas ocultas
                  <button onClick={() => setShowCompleted(true)}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.status !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Status: {filters.status === 'pending' ? 'Pendente' :
                           filters.status === 'in_progress' ? 'Em Progresso' :
                           filters.status === 'blocked' ? 'Bloqueado' :
                           filters.status === 'completed' ? 'Concluído' : 'Cancelado'}
                  <button onClick={() => handleFilterChange({ ...filters, status: 'all' })}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.priority !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Prioridade: {filters.priority === 'low' ? 'Baixa' :
                               filters.priority === 'medium' ? 'Média' :
                               filters.priority === 'high' ? 'Alta' : 'Urgente'}
                  <button onClick={() => handleFilterChange({ ...filters, priority: 'all' })}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filters.responsible !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Responsável: {people.find(p => p.id === filters.responsible)?.name}
                  <button onClick={() => handleFilterChange({ ...filters, responsible: 'all' })}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
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
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-card rounded-lg border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-1.5 px-2 w-8 sticky left-0 z-20 bg-muted">
                  <Checkbox
                    checked={selectedTasks.length === paginatedTasks.length && paginatedTasks.length > 0}
                    onCheckedChange={toggleAllTasks}
                  />
                </th>
                {/* All columns - unified */}
                {projectColumns.map((col, colIndex) => {
                  const isNameCol = colIndex === 0;
                  const isCompactCol = ['status', 'priority', 'startDate', 'endDate', 'progress'].includes(col.standardField || '') || ['number', 'percentage'].includes(col.type);
                  return (
                  <th
                    key={col.id}
                    className={cn(
                      "text-left py-1.5 px-2 text-xs font-medium text-muted-foreground whitespace-nowrap transition-all",
                      isCompactCol && "w-[1px]",
                      draggedColumnId === col.id && "opacity-50",
                      dragOverColumnId === col.id && "bg-primary/10 border-l-2 border-primary",
                      isNameCol && "sticky left-8 z-20 bg-muted after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border"
                    )}
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, col.id)}
                    onDragOver={(e) => handleColumnDragOver(e, col.id)}
                    onDragLeave={handleColumnDragLeave}
                    onDrop={(e) => handleColumnDrop(e, col.id)}
                    onDragEnd={handleColumnDragEnd}
                  >
                    <div className="flex items-center gap-1 group">
                      <GripVertical className="w-3 h-3 text-muted-foreground/50 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      {editingColumnId === col.id ? (
                        <input
                          ref={columnInputRef}
                          type="text"
                          value={editingColumnName}
                          onChange={(e) => setEditingColumnName(e.target.value)}
                          onBlur={saveColumnName}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveColumnName();
                            } else if (e.key === 'Escape') {
                              cancelEditingColumn();
                            }
                          }}
                          className="bg-background border border-primary rounded px-1.5 py-0.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[70px]"
                          autoFocus
                        />
                      ) : (
                        <span
                          className="cursor-text hover:text-foreground transition-colors"
                          onClick={() => startEditingColumn(col.id, col.name)}
                          title="Clique para editar o nome da coluna"
                        >
                          {col.name}
                        </span>
                      )}
                    </div>
                  </th>
                  );
                })}
                <th className="text-right py-1.5 px-2 text-xs font-medium text-muted-foreground w-8"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map(task => {
                const overdue = isTaskOverdue(task);

                return (
                  <tr
                    key={task.id}
                    className={cn(
                      "group/row border-t border-border hover:bg-muted/30 transition-colors",
                      overdue && "bg-status-blocked/5",
                      selectedTasks.includes(task.id) && "bg-primary/5"
                    )}
                  >
                    <td className={cn(
                      "py-1 px-2 sticky left-0 z-20 bg-card transition-colors",
                      "group-hover/row:bg-muted",
                      overdue && "!bg-red-50 dark:!bg-red-950/50 group-hover/row:!bg-muted",
                      selectedTasks.includes(task.id) && "!bg-blue-50 dark:!bg-blue-950/50 group-hover/row:!bg-muted"
                    )}>
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => toggleTaskSelection(task.id)}
                      />
                    </td>
                    {/* All columns - unified */}
                    {projectColumns.map((col, colIndex) => {
                      const isNameCol = colIndex === 0;
                      const isCompactCol = ['status', 'priority', 'startDate', 'endDate', 'progress'].includes(col.standardField || '') || ['number', 'percentage'].includes(col.type);
                      return (
                      <td
                        key={col.id}
                        className={cn(
                          "py-1 px-2 text-xs whitespace-nowrap",
                          isCompactCol && "w-[1px]",
                          isNameCol && "sticky left-8 z-20 bg-card after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border transition-colors",
                          isNameCol && "group-hover/row:bg-muted",
                          isNameCol && overdue && "!bg-red-50 dark:!bg-red-950/50 group-hover/row:!bg-muted",
                          isNameCol && selectedTasks.includes(task.id) && "!bg-blue-50 dark:!bg-blue-950/50 group-hover/row:!bg-muted"
                        )}
                      >
                        {renderCellContent(task, col)}
                      </td>
                      );
                    })}
                    <td className="py-1 px-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditTask(task)}>
                            <Edit className="w-3.5 h-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateTask(task)}>
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(task.id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
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
            {activeFiltersCount > 0 && (
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredTasks.length > 0 && (
          <div className="border-t border-border">
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredTasks.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
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

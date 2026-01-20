import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { isTaskOverdue } from '@/lib/mockData';
import { Task, Person, Milestone } from '@/lib/types';
import { Flag, Diamond, Pencil, Trash2, CheckCircle2, GripHorizontal, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';

interface ProjectGanttChartProps {
  tasks: Task[];
  people: Person[];
  projectId: string;
  milestones?: Milestone[];
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (milestoneId: string) => void;
  onUpdateMilestone?: (milestoneId: string, data: Partial<Milestone>) => void;
  onAddTask?: () => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

export const ProjectGanttChart = ({ 
  tasks, 
  people, 
  projectId, 
  milestones = [],
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onUpdateMilestone,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: ProjectGanttChartProps) => {
  const [draggingMilestone, setDraggingMilestone] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const chartRef = useRef<HTMLDivElement>(null);

  // Get milestones for this project
  const projectMilestones = useMemo(() => {
    return milestones.filter(m => m.projectId === projectId);
  }, [milestones, projectId]);

  // Calculate date range based on project tasks and milestones
  const dateRange = useMemo(() => {
    const dates = tasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean)) as string[];
    
    // Include milestone dates in range calculation
    const milestoneDates = projectMilestones
      .flatMap(m => [m.startDate, m.endDate, m.date].filter(Boolean)) as string[];
    
    const allDates = [...dates, ...milestoneDates];
    
    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 2, 0),
      };
    }
    const startDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 14);
    return { start: startDate, end: endDate };
  }, [tasks, projectMilestones]);

  // Generate columns (weeks view fixed)
  const columns = useMemo(() => {
    const cols: { date: Date; label: string }[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      cols.push({
        date: new Date(current),
        label: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      });
      current.setDate(current.getDate() + 7);
    }
    return cols;
  }, [dateRange]);

  // Group tasks by responsible (fixed)
  const groupedTasks = useMemo(() => {
    const groups: { id: string; name: string; color?: string; tasks: Task[] }[] = [];
    
    const usedPeople = new Set(tasks.map(t => t.responsibleId).filter(Boolean));
    people.filter(p => usedPeople.has(p.id)).forEach(person => {
      const personTasks = tasks.filter(t => t.responsibleId === person.id);
      if (personTasks.length > 0) {
        groups.push({ id: person.id, name: person.name, color: person.color, tasks: personTasks });
      }
    });
    const unassigned = tasks.filter(t => !t.responsibleId);
    if (unassigned.length > 0) {
      groups.push({ id: 'unassigned', name: 'Sem Responsável', tasks: unassigned });
    }
    
    return groups;
  }, [tasks, people]);

  // Get milestone position
  const getMilestonePosition = (milestone: Milestone) => {
    const start = milestone.startDate ? new Date(milestone.startDate) : 
                  milestone.date ? new Date(milestone.date) : null;
    const end = milestone.endDate ? new Date(milestone.endDate) : 
                milestone.date ? new Date(milestone.date) : null;
    
    if (!start) return null;
    
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = end ? (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) : 1;
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max((duration / totalDays) * 100, 2)}%`,
    };
  };

  const getTaskPosition = (task: Task) => {
    if (!task.startDate || !task.endDate) return null;
    
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max((duration / totalDays) * 100, 1)}%`,
    };
  };

  const getTodayPosition = () => {
    // Use Brazil timezone for accurate current day
    const now = new Date();
    const brazilOffset = -3 * 60;
    const localOffset = now.getTimezoneOffset();
    const diffMinutes = localOffset + brazilOffset;
    const today = new Date(now.getTime() + diffMinutes * 60 * 1000);
    today.setHours(12, 0, 0, 0);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
  };

  // Get date from position (for drag and drop)
  const getDateFromPosition = useCallback((clientX: number) => {
    if (!chartRef.current) return null;
    
    const chartRect = chartRef.current.getBoundingClientRect();
    const relativeX = clientX - chartRect.left;
    const percentage = relativeX / chartRect.width;
    
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    const newDate = new Date(dateRange.start.getTime() + (percentage * totalMs));
    
    return newDate.toISOString().split('T')[0];
  }, [dateRange]);

  // Handle drag
  const handleDragStart = (milestoneId: string) => {
    setDraggingMilestone(milestoneId);
  };

  const handleDragEnd = (e: React.DragEvent, milestoneId: string) => {
    if (!draggingMilestone) return;
    
    const newDate = getDateFromPosition(e.clientX);
    if (newDate) {
      onUpdateMilestone?.(milestoneId, { startDate: newDate });
    }
    setDraggingMilestone(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingMilestone) return;
    
    const newDate = getDateFromPosition(e.clientX);
    if (newDate) {
      onUpdateMilestone?.(draggingMilestone, { startDate: newDate });
    }
    setDraggingMilestone(null);
  };

  // Toggle group collapse
  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Toggle milestone completion
  const handleToggleComplete = (milestoneId: string, completed: boolean) => {
    onUpdateMilestone?.(milestoneId, { completed });
  };

  if (tasks.length === 0 && projectMilestones.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhuma tarefa ou marco com datas definidas neste projeto</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Simple Toolbar - Only Add Milestone */}
      <div className="flex gap-3 items-center">
        {onAddMilestone && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onAddMilestone}
          >
            <Flag className="w-4 h-4 mr-2" />
            Novo Marco
          </Button>
        )}
      </div>

      {/* Gantt Chart */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="flex border-b border-border">
              <div className="w-56 flex-shrink-0 p-4 bg-muted/50 font-medium text-sm text-muted-foreground">
                Responsável
              </div>
              <div className="flex-1 flex relative">
                {columns.map((col, i) => (
                  <div 
                    key={i} 
                    className="flex-1 p-2 text-center text-xs text-muted-foreground border-l border-border"
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestone Rows */}
            {projectMilestones.map((milestone, index) => {
              const position = getMilestonePosition(milestone);
              const isCompleted = milestone.completed;
              
              return (
                <div key={milestone.id} className="flex border-b border-border bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20">
                  <div className="w-56 flex-shrink-0 p-3 font-medium text-sm flex items-center gap-2 bg-amber-100/50 dark:bg-amber-900/30">
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: milestone.color || '#EAB308' }}
                    >
                      <Diamond className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-amber-800 dark:text-amber-300 truncate">{milestone.name}</span>
                  </div>
                  <div 
                    ref={index === 0 ? chartRef : undefined}
                    className="flex-1 relative h-12"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    {position && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div
                            draggable
                            onDragStart={() => handleDragStart(milestone.id)}
                            onDragEnd={(e) => handleDragEnd(e, milestone.id)}
                            className={cn(
                              "absolute top-2 h-8 rounded-md cursor-grab transition-all hover:shadow-lg",
                              draggingMilestone === milestone.id && "opacity-50 cursor-grabbing",
                              isCompleted ? "opacity-80" : ""
                            )}
                            style={{
                              left: position.left,
                              width: position.width,
                              minWidth: '80px',
                              backgroundColor: milestone.color || '#EAB308',
                            }}
                          >
                            <div className="h-full flex items-center justify-center px-2 text-xs text-white font-medium gap-1">
                              {isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                              <span className="truncate">
                                {milestone.startDate && new Date(milestone.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                {milestone.endDate && ` - ${new Date(milestone.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                              </span>
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-64 p-3">
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold">{milestone.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {milestone.startDate && new Date(milestone.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                {milestone.endDate && ` até ${new Date(milestone.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                              </p>
                              {milestone.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {milestone.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 py-2 border-t">
                              <Checkbox
                                id={`complete-${milestone.id}`}
                                checked={milestone.completed}
                                onCheckedChange={(checked) => handleToggleComplete(milestone.id, !!checked)}
                              />
                              <label 
                                htmlFor={`complete-${milestone.id}`}
                                className="text-sm cursor-pointer"
                              >
                                Marcar como concluído
                              </label>
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => onEditMilestone?.(milestone)}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" />
                                Editar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir este marco?')) {
                                    onDeleteMilestone?.(milestone.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Excluir
                              </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground text-center pt-2">
                              <GripHorizontal className="w-3 h-3 inline mr-1" />
                              Arraste para reposicionar
                            </p>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Body - Tasks grouped by responsible */}
            <div className="relative">
              {/* Today line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                style={{ left: getTodayPosition() }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary" />
              </div>

              {groupedTasks.map((group) => {
                const isCollapsed = collapsedGroups.has(group.id);
                const initials = group.name
                  .split(' ')
                  .map(n => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase();
                
                return (
                  <div key={group.id}>
                    {/* Group Header - Collapsible with larger name and initials */}
                    <div 
                      className="flex border-b border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="w-56 flex-shrink-0 p-4 font-semibold text-base flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                          style={{ backgroundColor: group.color || 'hsl(var(--muted-foreground))' }}
                        >
                          {initials}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{group.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">{group.tasks.length} tarefa{group.tasks.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex-1" />
                    </div>

                    {/* Tasks - Collapsible with smaller bullet style */}
                    {!isCollapsed && (
                      <>
                        {group.tasks.map((task) => {
                          const position = getTaskPosition(task);
                          const overdue = isTaskOverdue(task);

                          return (
                            <div 
                              key={task.id} 
                              className="flex border-b border-border/50 hover:bg-muted/20 group/task cursor-pointer"
                              onClick={() => onEditTask?.(task)}
                            >
                              <div className="w-56 flex-shrink-0 py-2 px-3 text-xs flex items-center gap-2 pl-14">
                                <div 
                                  className={cn(
                                    "w-2 h-2 rounded-full flex-shrink-0",
                                    overdue ? "bg-status-blocked" : 
                                    task.status === 'completed' ? "bg-status-completed" :
                                    task.status === 'in_progress' ? "bg-status-progress" :
                                    task.status === 'blocked' ? "bg-status-blocked" :
                                    "bg-status-pending"
                                  )}
                                />
                                <span className={cn("truncate flex-1 text-muted-foreground", overdue && "text-status-blocked")}>
                                  {task.name}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                  {onEditTask && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditTask(task);
                                      }}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </Button>
                                  )}
                                  {onDeleteTask && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Excluir tarefa?')) {
                                          onDeleteTask(task.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 relative h-8">
                                {position && (
                                  <div
                                    className={cn(
                                      "absolute top-1.5 h-5 rounded cursor-pointer transition-all hover:shadow-md",
                                      overdue ? "bg-status-blocked" : 
                                      task.status === 'completed' ? "bg-status-completed" :
                                      task.status === 'in_progress' ? "bg-status-progress" :
                                      task.status === 'blocked' ? "bg-status-blocked" :
                                      "bg-status-pending"
                                    )}
                                    style={{
                                      left: position.left,
                                      width: position.width,
                                      minWidth: '16px',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Add Task Button inside group */}
                        {onAddTask && (
                          <div className="flex border-b border-border/50">
                            <div className="w-56 flex-shrink-0 py-1 pl-14">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                                onClick={onAddTask}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Nova tarefa
                              </Button>
                            </div>
                            <div className="flex-1" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-pending" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-progress" />
          <span>Em Progresso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-blocked" />
          <span>Bloqueado/Atrasado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-status-completed" />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <Diamond className="w-3 h-3 text-white" />
          </div>
          <span>Marco</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-primary rounded" />
          <span>Hoje</span>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

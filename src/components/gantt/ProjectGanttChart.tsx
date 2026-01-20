import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isTaskOverdue } from '@/lib/mockData';
import { Task, Person, Milestone } from '@/lib/types';
import { Flag, Pencil, Trash2, CheckCircle2, ChevronDown, ChevronRight, Plus, GripHorizontal, ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

type ZoomLevel = 'day' | 'week' | 'month';

interface ProjectGanttChartProps {
  tasks: Task[];
  people: Person[];
  projectId: string;
  milestones?: Milestone[];
  onAddMilestone?: () => void;
  onEditMilestone?: (milestone: Milestone) => void;
  onDeleteMilestone?: (milestoneId: string) => void;
  onUpdateMilestone?: (milestoneId: string, data: Partial<Milestone>) => void;
  onAddTask?: (responsibleId?: string) => void;
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
  const [zoom, setZoom] = useState<ZoomLevel>('week');
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

  // Generate columns based on zoom level
  const columns = useMemo(() => {
    const cols: { date: Date; label: string; isMonthStart?: boolean }[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      let label = '';
      let isMonthStart = false;
      
      if (zoom === 'day') {
        label = current.toLocaleDateString('pt-BR', { day: '2-digit' });
        isMonthStart = current.getDate() === 1;
        cols.push({ date: new Date(current), label, isMonthStart });
        current.setDate(current.getDate() + 1);
      } else if (zoom === 'week') {
        label = current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        cols.push({ date: new Date(current), label });
        current.setDate(current.getDate() + 7);
      } else {
        // month
        label = current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        cols.push({ date: new Date(current), label });
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
      }
    }
    return cols;
  }, [dateRange, zoom]);

  // Get min width based on zoom
  const getMinWidth = () => {
    if (zoom === 'day') return `${Math.max(900, columns.length * 28)}px`;
    if (zoom === 'week') return '900px';
    return '700px';
  };

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
      width: `${Math.max((duration / totalDays) * 100, 1)}%`,
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
      width: `${Math.max((duration / totalDays) * 100, 0.8)}%`,
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

  const getStatusColor = (task: Task) => {
    const overdue = isTaskOverdue(task);
    if (overdue) return 'bg-red-500';
    if (task.status === 'completed') return 'bg-emerald-500';
    if (task.status === 'in_progress') return 'bg-blue-500';
    if (task.status === 'blocked') return 'bg-red-500';
    return 'bg-amber-500';
  };

  const getStatusDot = (task: Task) => {
    const overdue = isTaskOverdue(task);
    if (overdue) return 'bg-red-500';
    if (task.status === 'completed') return 'bg-emerald-500';
    if (task.status === 'in_progress') return 'bg-blue-500';
    if (task.status === 'blocked') return 'bg-red-500';
    return 'bg-amber-500';
  };

  if (tasks.length === 0 && projectMilestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4">
        <p className="text-sm">Nenhuma tarefa ou marco com datas definidas</p>
        {onAddMilestone && (
          <Button variant="outline" size="sm" onClick={onAddMilestone}>
            <Flag className="w-4 h-4 mr-2" />
            Criar primeiro marco
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {onAddMilestone && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAddMilestone}
              className="h-8 text-xs"
            >
              <Flag className="w-3.5 h-3.5 mr-1.5" />
              Novo Marco
            </Button>
          )}
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Zoom:</span>
          <ToggleGroup 
            type="single" 
            value={zoom} 
            onValueChange={(value) => value && setZoom(value as ZoomLevel)}
            className="h-7"
          >
            <ToggleGroupItem value="day" className="h-7 px-2 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <ZoomIn className="w-3 h-3 mr-1" />
              Dia
            </ToggleGroupItem>
            <ToggleGroupItem value="week" className="h-7 px-2 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Calendar className="w-3 h-3 mr-1" />
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="h-7 px-2 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <ZoomOut className="w-3 h-3 mr-1" />
              Mês
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: getMinWidth() }}>
            
            {/* Timeline Header */}
            <div className="flex bg-muted/30 border-b border-border">
              <div className="w-48 flex-shrink-0 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cronograma
              </div>
              <div className="flex-1 flex">
                {columns.map((col, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 py-2 text-center font-medium text-muted-foreground border-l border-border/50",
                      zoom === 'day' ? "text-[8px] px-0.5 min-w-[28px]" : "text-[10px] px-1",
                      col.isMonthStart && "border-l-2 border-l-primary/50"
                    )}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Milestones Section */}
            {projectMilestones.length > 0 && (
              <div className="border-b border-border">
                {projectMilestones.map((milestone, index) => {
                  const position = getMilestonePosition(milestone);
                  const isCompleted = milestone.completed;
                  
                  return (
                    <div 
                      key={milestone.id} 
                      className="flex group/milestone hover:bg-muted/20 transition-colors"
                    >
                      {/* Milestone Name */}
                      <div className="w-48 flex-shrink-0 px-3 py-1.5 flex items-center gap-2 border-r border-border/30">
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: milestone.color || '#f59e0b' }}
                        />
                        <span className={cn(
                          "text-xs font-medium truncate",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {milestone.name}
                        </span>
                      </div>
                      
                      {/* Milestone Bar */}
                      <div 
                        ref={index === 0 ? chartRef : undefined}
                        className="flex-1 relative h-7"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                      >
                        {/* Grid lines */}
                        <div className="absolute inset-0 flex">
                          {columns.map((_, i) => (
                            <div key={i} className="flex-1 border-l border-border/20" />
                          ))}
                        </div>
                        
                        {position && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <div
                                draggable
                                onDragStart={() => handleDragStart(milestone.id)}
                                onDragEnd={(e) => handleDragEnd(e, milestone.id)}
                                className={cn(
                                  "absolute top-1.5 h-4 rounded-full cursor-grab transition-all hover:h-5 hover:top-1",
                                  "flex items-center justify-center",
                                  draggingMilestone === milestone.id && "opacity-50 cursor-grabbing",
                                  isCompleted && "opacity-60"
                                )}
                                style={{
                                  left: position.left,
                                  width: position.width,
                                  minWidth: '60px',
                                  backgroundColor: milestone.color || '#f59e0b',
                                }}
                              >
                                <span className="text-[9px] text-white font-medium px-2 truncate">
                                  {milestone.startDate && new Date(milestone.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  {milestone.endDate && ` - ${new Date(milestone.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                                </span>
                                {isCompleted && <CheckCircle2 className="w-3 h-3 text-white ml-1 flex-shrink-0" />}
                              </div>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="w-56 p-2.5">
                              <div className="space-y-2">
                                <div>
                                  <p className="font-medium text-sm">{milestone.name}</p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {milestone.startDate && new Date(milestone.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                    {milestone.endDate && ` → ${new Date(milestone.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}`}
                                  </p>
                                  {milestone.description && (
                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                      {milestone.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 py-1.5 border-t">
                                  <Checkbox
                                    id={`complete-${milestone.id}`}
                                    checked={milestone.completed}
                                    onCheckedChange={(checked) => handleToggleComplete(milestone.id, !!checked)}
                                    className="h-3.5 w-3.5"
                                  />
                                  <label 
                                    htmlFor={`complete-${milestone.id}`}
                                    className="text-[10px] cursor-pointer"
                                  >
                                    Concluído
                                  </label>
                                </div>
                                <div className="flex gap-1.5 pt-1.5 border-t">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 h-7 text-[10px]"
                                    onClick={() => onEditMilestone?.(milestone)}
                                  >
                                    <Pencil className="w-3 h-3 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-1 h-7 text-[10px] text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm('Excluir marco?')) {
                                        onDeleteMilestone?.(milestone.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Excluir
                                  </Button>
                                </div>
                                <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
                                  <GripHorizontal className="w-2.5 h-2.5" />
                                  Arraste para mover
                                </p>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tasks Section */}
            <div className="relative">
              {/* Today indicator */}
              <div 
                className="absolute top-0 bottom-0 w-px bg-primary/80 z-20 pointer-events-none"
                style={{ left: `calc(192px + ${getTodayPosition()})` }}
              >
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
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
                  <div key={group.id} className="border-b border-border/50 last:border-b-0">
                    {/* Group Header */}
                    <div 
                      className="flex items-center cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleGroup(group.id)}
                    >
                      <div className="w-48 flex-shrink-0 px-2 py-1.5 flex items-center gap-1.5">
                        <button className="p-0.5 rounded hover:bg-muted">
                          {isCollapsed ? (
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                        <div 
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold flex-shrink-0"
                          style={{ backgroundColor: group.color || 'hsl(var(--muted-foreground))' }}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium truncate block">{group.name}</span>
                          <span className="text-[10px] text-muted-foreground">{group.tasks.length} tarefa{group.tasks.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex-1 h-8" />
                    </div>

                    {/* Tasks */}
                    {!isCollapsed && (
                      <>
                        {group.tasks.map((task) => {
                          const position = getTaskPosition(task);
                          const overdue = isTaskOverdue(task);

                          return (
                            <div 
                              key={task.id} 
                              className="flex items-center hover:bg-muted/20 group/task cursor-pointer transition-colors"
                              onClick={() => onEditTask?.(task)}
                            >
                              {/* Task Name */}
                              <div className="w-48 flex-shrink-0 py-1 px-2 pl-9 flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", getStatusDot(task))} />
                                <span className={cn(
                                  "text-[11px] truncate flex-1",
                                  overdue ? "text-red-500" : "text-muted-foreground",
                                  task.status === 'completed' && "line-through"
                                )}>
                                  {task.name}
                                </span>
                                {/* Actions */}
                                <div className="flex gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity">
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
                                      <Pencil className="w-2.5 h-2.5" />
                                    </Button>
                                  )}
                                  {onDeleteTask && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 text-destructive hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Excluir?')) {
                                          onDeleteTask(task.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Task Bar */}
                              <div className="flex-1 relative h-6">
                                {/* Grid */}
                                <div className="absolute inset-0 flex">
                                  {columns.map((_, i) => (
                                    <div key={i} className="flex-1 border-l border-border/10" />
                                  ))}
                                </div>
                                
                                {position && (
                                  <div
                                    className={cn(
                                      "absolute top-2 h-2 rounded-sm transition-all hover:h-3 hover:top-1.5",
                                      getStatusColor(task)
                                    )}
                                    style={{
                                      left: position.left,
                                      width: position.width,
                                      minWidth: '8px',
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Add Task */}
                        {onAddTask && group.id !== 'unassigned' && (
                          <div className="flex items-center">
                            <div className="w-48 flex-shrink-0 py-0.5 pl-9">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 text-[10px] text-muted-foreground hover:text-foreground px-1.5"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddTask(group.id);
                                }}
                              >
                                <Plus className="w-2.5 h-2.5 mr-0.5" />
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

      {/* Compact Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Pendente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span>Em Progresso</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Bloqueado/Atrasado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Concluído</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-0.5 h-3 bg-primary rounded" />
          <span>Hoje</span>
        </div>
      </div>
    </div>
  );
};

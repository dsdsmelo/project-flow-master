import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isTaskOverdue } from '@/lib/mockData';
import { Task, Person, Milestone } from '@/lib/types';
import { Flag, Pencil, Trash2, CheckCircle2, ChevronDown, ChevronRight, Plus, GripHorizontal, Calendar, CalendarDays, CalendarRange } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

  const projectMilestones = useMemo(() => {
    return milestones.filter(m => m.projectId === projectId);
  }, [milestones, projectId]);

  const dateRange = useMemo(() => {
    const dates = tasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean)) as string[];
    const milestoneDates = projectMilestones
      .flatMap(m => [m.startDate, m.endDate, m.date].filter(Boolean)) as string[];
    
    const allDates = [...dates, ...milestoneDates];
    
    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
      };
    }
    const startDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
    startDate.setDate(startDate.getDate() - 14);
    endDate.setDate(endDate.getDate() + 21);
    return { start: startDate, end: endDate };
  }, [tasks, projectMilestones]);

  const columns = useMemo(() => {
    const cols: { date: Date; label: string; subLabel?: string }[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      if (zoom === 'day') {
        cols.push({
          date: new Date(current),
          label: current.toLocaleDateString('pt-BR', { day: '2-digit' }),
          subLabel: current.getDate() === 1 ? current.toLocaleDateString('pt-BR', { month: 'short' }) : undefined,
        });
        current.setDate(current.getDate() + 1);
      } else if (zoom === 'week') {
        cols.push({
          date: new Date(current),
          label: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        });
        current.setDate(current.getDate() + 7);
      } else {
        cols.push({
          date: new Date(current),
          label: current.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          subLabel: current.toLocaleDateString('pt-BR', { year: '2-digit' }),
        });
        current.setMonth(current.getMonth() + 1);
        current.setDate(1);
      }
    }
    return cols;
  }, [dateRange, zoom]);

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

  const getPosition = (startDate: string | null | undefined, endDate: string | null | undefined) => {
    if (!startDate) return null;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(startDate);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = Math.max((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24), 1);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${Math.max((duration / totalDays) * 100, 0.5)}%`,
    };
  };

  const getTodayPosition = () => {
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

  const getDateFromPosition = useCallback((clientX: number) => {
    if (!chartRef.current) return null;
    const chartRect = chartRef.current.getBoundingClientRect();
    const relativeX = clientX - chartRect.left;
    const percentage = relativeX / chartRect.width;
    const totalMs = dateRange.end.getTime() - dateRange.start.getTime();
    const newDate = new Date(dateRange.start.getTime() + (percentage * totalMs));
    return newDate.toISOString().split('T')[0];
  }, [dateRange]);

  const handleDragStart = (milestoneId: string) => setDraggingMilestone(milestoneId);
  
  const handleDragEnd = (e: React.DragEvent, milestoneId: string) => {
    if (!draggingMilestone) return;
    const newDate = getDateFromPosition(e.clientX);
    if (newDate) onUpdateMilestone?.(milestoneId, { startDate: newDate });
    setDraggingMilestone(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggingMilestone) return;
    const newDate = getDateFromPosition(e.clientX);
    if (newDate) onUpdateMilestone?.(draggingMilestone, { startDate: newDate });
    setDraggingMilestone(null);
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const getStatusStyles = (task: Task) => {
    const overdue = isTaskOverdue(task);
    if (overdue) return { bg: 'bg-red-500', text: 'text-red-600', dot: 'bg-red-500' };
    if (task.status === 'completed') return { bg: 'bg-emerald-500', text: 'text-emerald-600', dot: 'bg-emerald-500' };
    if (task.status === 'in_progress') return { bg: 'bg-blue-500', text: 'text-blue-600', dot: 'bg-blue-500' };
    if (task.status === 'blocked') return { bg: 'bg-red-500', text: 'text-red-600', dot: 'bg-red-500' };
    return { bg: 'bg-amber-500', text: 'text-amber-600', dot: 'bg-amber-500' };
  };

  const columnWidth = zoom === 'day' ? 'min-w-[32px]' : zoom === 'week' ? 'min-w-[80px]' : 'min-w-[100px]';
  const chartMinWidth = zoom === 'day' ? `${columns.length * 32 + 220}px` : zoom === 'week' ? '1000px' : '800px';

  if (tasks.length === 0 && projectMilestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-muted/20 rounded-xl border-2 border-dashed border-border">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Nenhum item no cronograma</p>
            <p className="text-sm text-muted-foreground">Adicione tarefas com datas ou crie um marco</p>
          </div>
          {onAddMilestone && (
            <Button variant="outline" onClick={onAddMilestone} className="mt-2">
              <Flag className="w-4 h-4 mr-2" />
              Criar Marco
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {onAddMilestone && (
              <Button 
                variant="outline" 
                onClick={onAddMilestone}
                className="h-9"
              >
                <Flag className="w-4 h-4 mr-2" />
                Novo Marco
              </Button>
            )}
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={zoom === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setZoom('day')}
              className={cn(
                "h-8 px-3 text-sm font-medium",
                zoom === 'day' && "shadow-sm"
              )}
            >
              <CalendarDays className="w-4 h-4 mr-1.5" />
              Dia
            </Button>
            <Button
              variant={zoom === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setZoom('week')}
              className={cn(
                "h-8 px-3 text-sm font-medium",
                zoom === 'week' && "shadow-sm"
              )}
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Semana
            </Button>
            <Button
              variant={zoom === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setZoom('month')}
              className={cn(
                "h-8 px-3 text-sm font-medium",
                zoom === 'month' && "shadow-sm"
              )}
            >
              <CalendarRange className="w-4 h-4 mr-1.5" />
              Mês
            </Button>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: chartMinWidth }}>
              
              {/* Timeline Header */}
              <div className="flex bg-gradient-to-b from-muted/60 to-muted/30 border-b border-border sticky top-0 z-10">
                <div className="w-[220px] flex-shrink-0 px-4 py-3 font-semibold text-sm text-foreground border-r border-border/50">
                  Cronograma
                </div>
                <div className="flex-1 flex">
                  {columns.map((col, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 py-2 text-center border-l border-border/30 flex flex-col justify-center",
                        columnWidth
                      )}
                    >
                      {col.subLabel && (
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                          {col.subLabel}
                        </span>
                      )}
                      <span className={cn(
                        "font-medium text-foreground",
                        zoom === 'day' ? "text-xs" : "text-sm"
                      )}>
                        {col.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Milestones Section */}
              {projectMilestones.length > 0 && (
                <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-b border-amber-200/50 dark:border-amber-800/30">
                  <div className="px-4 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider border-b border-amber-200/30 dark:border-amber-800/20">
                    Marcos do Projeto
                  </div>
                  {projectMilestones.map((milestone, index) => {
                    const position = getPosition(milestone.startDate || milestone.date, milestone.endDate || milestone.date);
                    const isCompleted = milestone.completed;
                    
                    return (
                      <div 
                        key={milestone.id} 
                        className="flex group hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <div className="w-[220px] flex-shrink-0 px-4 py-2.5 flex items-center gap-3 border-r border-amber-200/30 dark:border-amber-800/20">
                          <div 
                            className="w-3 h-3 rounded-sm rotate-45 flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: milestone.color || '#f59e0b' }}
                          />
                          <span className={cn(
                            "text-sm font-medium truncate",
                            isCompleted && "line-through text-muted-foreground"
                          )}>
                            {milestone.name}
                          </span>
                          {isCompleted && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div 
                          ref={index === 0 ? chartRef : undefined}
                          className="flex-1 relative h-10"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
                        >
                          {/* Grid */}
                          <div className="absolute inset-0 flex pointer-events-none">
                            {columns.map((_, i) => (
                              <div key={i} className={cn("flex-1 border-l border-amber-200/20 dark:border-amber-800/10", columnWidth)} />
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
                                    "absolute top-2 h-6 rounded-md cursor-grab transition-all shadow-sm hover:shadow-md hover:scale-[1.02]",
                                    "flex items-center justify-center gap-1.5 px-3",
                                    draggingMilestone === milestone.id && "opacity-50 cursor-grabbing scale-105",
                                    isCompleted && "opacity-70"
                                  )}
                                  style={{
                                    left: position.left,
                                    width: position.width,
                                    minWidth: '80px',
                                    backgroundColor: milestone.color || '#f59e0b',
                                  }}
                                >
                                  <span className="text-xs text-white font-semibold truncate">
                                    {milestone.startDate && new Date(milestone.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                    {milestone.endDate && ` → ${new Date(milestone.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                                  </span>
                                </div>
                              </PopoverTrigger>
                              <PopoverContent side="top" className="w-72 p-4">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-semibold text-base">{milestone.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {milestone.startDate && new Date(milestone.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                      {milestone.endDate && ` até ${new Date(milestone.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                                    </p>
                                    {milestone.description && (
                                      <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                                        {milestone.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 py-2 border-t">
                                    <Checkbox
                                      id={`complete-${milestone.id}`}
                                      checked={milestone.completed}
                                      onCheckedChange={(checked) => onUpdateMilestone?.(milestone.id, { completed: !!checked })}
                                    />
                                    <label htmlFor={`complete-${milestone.id}`} className="text-sm cursor-pointer">
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
                                      <Pencil className="w-4 h-4 mr-1.5" />
                                      Editar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => {
                                        if (confirm('Excluir este marco?')) {
                                          onDeleteMilestone?.(milestone.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4 mr-1.5" />
                                      Excluir
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5 pt-1">
                                    <GripHorizontal className="w-3.5 h-3.5" />
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
                </div>
              )}

              {/* Tasks Section */}
              <div className="relative">
                {/* Today indicator */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary to-primary/50 z-20 pointer-events-none"
                  style={{ left: `calc(220px + (100% - 220px) * ${parseFloat(getTodayPosition()) / 100})` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-sm whitespace-nowrap">
                    Hoje
                  </div>
                </div>

                {groupedTasks.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.id);
                  const initials = group.name
                    .split(' ')
                    .map(n => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  
                  const completedCount = group.tasks.filter(t => t.status === 'completed').length;
                  const progress = Math.round((completedCount / group.tasks.length) * 100);
                  
                  return (
                    <div key={group.id} className="border-b border-border last:border-b-0">
                      {/* Group Header */}
                      <div 
                        className="flex items-center cursor-pointer hover:bg-muted/40 transition-colors bg-muted/20"
                        onClick={() => toggleGroup(group.id)}
                      >
                        <div className="w-[220px] flex-shrink-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-border/50">
                          <button className="p-1 rounded hover:bg-muted transition-colors">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: group.color || 'hsl(var(--muted-foreground))' }}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate text-foreground">{group.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {group.tasks.length} tarefa{group.tasks.length !== 1 ? 's' : ''}
                              </span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[60px] overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 h-[52px]" />
                      </div>

                      {/* Tasks */}
                      {!isCollapsed && (
                        <>
                          {group.tasks.map((task) => {
                            const position = getPosition(task.startDate, task.endDate);
                            const styles = getStatusStyles(task);

                            return (
                              <div 
                                key={task.id} 
                                className="flex items-center hover:bg-muted/30 group/task cursor-pointer transition-colors"
                                onClick={() => onEditTask?.(task)}
                              >
                                <div className="w-[220px] flex-shrink-0 py-2 px-3 pl-14 flex items-center gap-2 border-r border-border/30">
                                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", styles.dot)} />
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={cn(
                                        "text-sm truncate flex-1",
                                        task.status === 'completed' ? "line-through text-muted-foreground" : "text-foreground"
                                      )}>
                                        {task.name}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <div className="space-y-1">
                                        <p className="font-medium">{task.name}</p>
                                        {task.startDate && task.endDate && (
                                          <p className="text-xs text-muted-foreground">
                                            {new Date(task.startDate).toLocaleDateString('pt-BR')} → {new Date(task.endDate).toLocaleDateString('pt-BR')}
                                          </p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  {/* Hover Actions */}
                                  <div className="flex gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                    {onEditTask && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onEditTask(task);
                                        }}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                    {onDeleteTask && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-destructive hover:text-destructive"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm('Excluir tarefa?')) {
                                            onDeleteTask(task.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Task Bar */}
                                <div className="flex-1 relative h-10">
                                  {/* Grid */}
                                  <div className="absolute inset-0 flex pointer-events-none">
                                    {columns.map((_, i) => (
                                      <div key={i} className={cn("flex-1 border-l border-border/10", columnWidth)} />
                                    ))}
                                  </div>
                                  
                                  {position && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className={cn(
                                            "absolute top-2.5 h-5 rounded-md transition-all shadow-sm hover:shadow-md hover:scale-y-125 hover:brightness-110",
                                            styles.bg
                                          )}
                                          style={{
                                            left: position.left,
                                            width: position.width,
                                            minWidth: '12px',
                                          }}
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <div className="text-xs">
                                          <p className="font-medium">{task.name}</p>
                                          {task.startDate && task.endDate && (
                                            <p className="text-muted-foreground">
                                              {new Date(task.startDate).toLocaleDateString('pt-BR')} → {new Date(task.endDate).toLocaleDateString('pt-BR')}
                                            </p>
                                          )}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Add Task */}
                          {onAddTask && group.id !== 'unassigned' && (
                            <div className="flex items-center border-t border-border/20">
                              <div className="w-[220px] flex-shrink-0 py-1.5 pl-14">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTask(group.id);
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" />
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Em Progresso</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Bloqueado/Atrasado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-primary rounded-full" />
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

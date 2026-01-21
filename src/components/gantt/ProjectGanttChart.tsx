import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isTaskOverdue } from '@/lib/mockData';
import { Task, Person, Milestone, Phase } from '@/lib/types';
import { Flag, Pencil, Trash2, CheckCircle2, ChevronDown, ChevronRight, Plus, GripHorizontal, Calendar, CalendarDays, CalendarRange, Diamond, Layers } from 'lucide-react';
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
import { AvatarCircle } from '@/components/ui/avatar-circle';

type ZoomLevel = 'day' | 'week' | 'month';

interface ProjectGanttChartProps {
  tasks: Task[];
  people: Person[];
  projectId: string;
  phases?: Phase[];
  milestones?: Milestone[];
  onAddPhase?: () => void;
  onEditPhase?: (phase: Phase) => void;
  onDeletePhase?: (phaseId: string) => void;
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
  phases = [],
  milestones = [],
  onAddPhase,
  onEditPhase,
  onDeletePhase,
  onAddMilestone,
  onEditMilestone,
  onDeleteMilestone,
  onUpdateMilestone,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: ProjectGanttChartProps) => {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const chartRef = useRef<HTMLDivElement>(null);

  const projectPhases = useMemo(() => phases.filter(p => p.projectId === projectId), [phases, projectId]);
  const projectMilestones = useMemo(() => milestones.filter(m => m.projectId === projectId), [milestones, projectId]);

  const dateRange = useMemo(() => {
    const dates = tasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean)) as string[];
    const phaseDates = projectPhases.flatMap(p => [p.startDate, p.endDate].filter(Boolean)) as string[];
    const milestoneDates = projectMilestones.map(m => m.date).filter(Boolean) as string[];
    
    const allDates = [...dates, ...phaseDates, ...milestoneDates];
    
    if (allDates.length === 0) {
      const today = new Date();
      return { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 3, 0) };
    }
    const startDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const endDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
    startDate.setDate(startDate.getDate() - 14);
    endDate.setDate(endDate.getDate() + 21);
    return { start: startDate, end: endDate };
  }, [tasks, projectPhases, projectMilestones]);

  const columns = useMemo(() => {
    const cols: { date: Date; label: string; subLabel?: string }[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      if (zoom === 'day') {
        cols.push({ date: new Date(current), label: current.toLocaleDateString('pt-BR', { day: '2-digit' }), subLabel: current.getDate() === 1 ? current.toLocaleDateString('pt-BR', { month: 'short' }) : undefined });
        current.setDate(current.getDate() + 1);
      } else if (zoom === 'week') {
        cols.push({ date: new Date(current), label: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) });
        current.setDate(current.getDate() + 7);
      } else {
        cols.push({ date: new Date(current), label: current.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), subLabel: current.toLocaleDateString('pt-BR', { year: '2-digit' }) });
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
      if (personTasks.length > 0) groups.push({ id: person.id, name: person.name, color: person.color, tasks: personTasks });
    });
    const unassigned = tasks.filter(t => !t.responsibleId);
    if (unassigned.length > 0) groups.push({ id: 'unassigned', name: 'Sem Responsável', tasks: unassigned });
    return groups;
  }, [tasks, people]);

  const getPosition = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return null;
    const startD = new Date(start);
    const endD = end ? new Date(end) : new Date(start);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (startD.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = Math.max((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24), 1);
    return { left: `${(startOffset / totalDays) * 100}%`, width: `${Math.max((duration / totalDays) * 100, 0.5)}%` };
  };

  const getMilestonePosition = (date: string) => {
    const d = new Date(date);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (d.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
  };

  const getTodayPosition = () => {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (now.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
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
    if (overdue) return { bg: 'bg-red-500', dot: 'bg-red-500' };
    if (task.status === 'completed') return { bg: 'bg-emerald-500', dot: 'bg-emerald-500' };
    if (task.status === 'in_progress') return { bg: 'bg-blue-500', dot: 'bg-blue-500' };
    if (task.status === 'blocked') return { bg: 'bg-red-500', dot: 'bg-red-500' };
    return { bg: 'bg-amber-500', dot: 'bg-amber-500' };
  };

  const columnWidth = zoom === 'day' ? 'min-w-[32px]' : zoom === 'week' ? 'min-w-[80px]' : 'min-w-[100px]';
  const chartMinWidth = zoom === 'day' ? `${columns.length * 32 + 300}px` : zoom === 'week' ? '1100px' : '900px';
  const labelColumnWidth = 'w-[300px]';

  if (tasks.length === 0 && projectPhases.length === 0 && projectMilestones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-72 bg-muted/20 rounded-xl border-2 border-dashed border-border">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Nenhum item no cronograma</p>
            <p className="text-sm text-muted-foreground">Adicione fases, marcos ou tarefas com datas</p>
          </div>
          <div className="flex gap-2 justify-center">
            {onAddPhase && <Button variant="outline" size="sm" onClick={onAddPhase}><Layers className="w-4 h-4 mr-2" />Nova Fase</Button>}
            {onAddMilestone && <Button variant="outline" size="sm" onClick={onAddMilestone}><Diamond className="w-4 h-4 mr-2" />Novo Marco</Button>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {onAddPhase && <Button variant="outline" onClick={onAddPhase} className="h-9"><Layers className="w-4 h-4 mr-2" />Nova Fase</Button>}
            {onAddMilestone && <Button variant="outline" onClick={onAddMilestone} className="h-9"><Diamond className="w-4 h-4 mr-2" />Novo Marco</Button>}
          </div>
          
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button variant={zoom === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setZoom('day')} className="h-8 px-3 text-sm"><CalendarDays className="w-4 h-4 mr-1.5" />Dia</Button>
            <Button variant={zoom === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setZoom('week')} className="h-8 px-3 text-sm"><Calendar className="w-4 h-4 mr-1.5" />Semana</Button>
            <Button variant={zoom === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setZoom('month')} className="h-8 px-3 text-sm"><CalendarRange className="w-4 h-4 mr-1.5" />Mês</Button>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div style={{ minWidth: chartMinWidth }}>
              
              {/* Header */}
              <div className="flex bg-gradient-to-b from-muted/60 to-muted/30 border-b border-border sticky top-0 z-10">
                <div className={cn(labelColumnWidth, "flex-shrink-0 px-4 py-3 font-semibold text-sm border-r border-border/50")}>Cronograma</div>
                <div className="flex-1 flex">
                  {columns.map((col, i) => (
                    <div key={i} className={cn("flex-1 py-2 text-center border-l border-border/30 flex flex-col justify-center", columnWidth)}>
                      {col.subLabel && <span className="text-[10px] text-muted-foreground uppercase">{col.subLabel}</span>}
                      <span className={cn("font-medium", zoom === 'day' ? "text-xs" : "text-sm")}>{col.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fases e Marcos - Unified Section */}
              {(projectPhases.length > 0 || projectMilestones.length > 0) && (
                <div className="bg-gradient-to-r from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-b border-amber-200/50">
                  <div className="px-4 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider border-b border-amber-200/30">Fases e Marcos</div>
                  
                  {/* Phases as thin bars */}
                  {projectPhases.map((phase) => {
                    const position = getPosition(phase.startDate, phase.endDate);
                    return (
                      <div key={phase.id} className="flex group hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors">
                        <div className={cn(labelColumnWidth, "flex-shrink-0 px-4 py-0.5 flex items-center gap-2 border-r border-amber-200/30")}>
                          <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: phase.color || '#f59e0b' }} />
                          <span className="text-xs font-medium truncate">{phase.name}</span>
                          <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100">
                            {onEditPhase && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onEditPhase(phase)}><Pencil className="w-2.5 h-2.5" /></Button>}
                            {onDeletePhase && <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => { if(confirm('Excluir fase?')) onDeletePhase(phase.id); }}><Trash2 className="w-2.5 h-2.5" /></Button>}
                          </div>
                        </div>
                        <div ref={chartRef} className="flex-1 relative h-5">
                          <div className="absolute inset-0 flex pointer-events-none">{columns.map((_, i) => <div key={i} className={cn("flex-1 border-l border-amber-200/20", columnWidth)} />)}</div>
                          {position && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="absolute top-1 h-3 rounded-sm shadow-sm cursor-pointer" style={{ left: position.left, width: position.width, minWidth: '20px', backgroundColor: phase.color || '#f59e0b' }} />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-medium">{phase.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {phase.startDate && new Date(phase.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                  {phase.endDate && ` → ${new Date(phase.endDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`}
                                </p>
                                {phase.description && <p className="text-xs text-muted-foreground">{phase.description}</p>}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Milestones as diamonds with labels below */}
                  {projectMilestones.length > 0 && (
                    <div className="flex bg-blue-50/50 dark:bg-blue-950/20 border-t border-blue-200/30">
                      <div className={cn(labelColumnWidth, "flex-shrink-0 px-4 py-1 flex items-center border-r border-amber-200/30")}>
                        <span className="text-xs text-muted-foreground">Marcos do projeto</span>
                      </div>
                      <div className="flex-1 relative h-14">
                        <div className="absolute inset-0 flex pointer-events-none">{columns.map((_, i) => <div key={i} className={cn("flex-1 border-l border-amber-200/20", columnWidth)} />)}</div>
                        {projectMilestones.map(m => (
                          <Popover key={m.id}>
                            <PopoverTrigger asChild>
                              <div className="absolute top-1 -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform z-10 flex flex-col items-center" style={{ left: getMilestonePosition(m.date) }}>
                                <div className="relative">
                                  <Diamond className="w-5 h-5 drop-shadow-md" style={{ fill: m.color || '#3b82f6', color: m.color || '#3b82f6' }} />
                                  {m.completed && <CheckCircle2 className="w-3 h-3 absolute -top-1 -right-1 text-emerald-500" />}
                                </div>
                                <span className={cn("text-[9px] font-medium mt-0.5 whitespace-nowrap max-w-[60px] truncate text-center", m.completed && "line-through opacity-60")} style={{ color: m.color || '#3b82f6' }}>{m.name}</span>
                                <span className="text-[8px] text-muted-foreground">{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent side="top" className="w-64 p-3">
                              <div className="space-y-2">
                                <p className="font-semibold">{m.name}</p>
                                <p className="text-sm text-muted-foreground">{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  <Checkbox id={`m-${m.id}`} checked={m.completed} onCheckedChange={(c) => onUpdateMilestone?.(m.id, { completed: !!c })} />
                                  <label htmlFor={`m-${m.id}`} className="text-sm cursor-pointer">Concluído</label>
                                </div>
                                <div className="flex gap-2 pt-2 border-t">
                                  <Button variant="outline" size="sm" className="flex-1" onClick={() => onEditMilestone?.(m)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>
                                  <Button variant="outline" size="sm" className="flex-1 text-destructive" onClick={() => { if(confirm('Excluir?')) onDeleteMilestone?.(m.id); }}><Trash2 className="w-3 h-3 mr-1" />Excluir</Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tasks Section */}
              <div className="relative">
                <div className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none" style={{ left: `calc(300px + (100% - 300px) * ${parseFloat(getTodayPosition()) / 100})` }}>
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-sm">Hoje</div>
                </div>

                {groupedTasks.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.id);
                  const completedCount = group.tasks.filter(t => t.status === 'completed').length;
                  const progress = Math.round((completedCount / group.tasks.length) * 100);
                  const person = people.find(p => p.id === group.id);
                  
                  return (
                    <div key={group.id} className="border-b border-border/50 last:border-b-0">
                      <div className="flex items-center cursor-pointer hover:bg-muted/50 transition-colors bg-muted/30 border-b border-border/30" onClick={() => toggleGroup(group.id)}>
                        <div className={cn(labelColumnWidth, "flex-shrink-0 px-3 py-2.5 flex items-center gap-2.5 border-r border-border/50")}>
                          <button className="p-1 rounded hover:bg-muted">{isCollapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</button>
                          {person ? (
                            <AvatarCircle name={person.name} color={person.color} size="md" avatarUrl={person.avatarUrl} />
                          ) : (
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm bg-muted-foreground">{group.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{group.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{group.tasks.length} tarefa{group.tasks.length !== 1 ? 's' : ''}</span>
                              <div className="flex-1 h-1.5 bg-muted rounded-full max-w-[60px] overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} /></div>
                              <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 h-[52px]" />
                      </div>

                      {!isCollapsed && (
                        <>
                          {group.tasks.map((task) => {
                            const position = getPosition(task.startDate, task.endDate);
                            const styles = getStatusStyles(task);
                            return (
                              <div key={task.id} className="flex items-center hover:bg-muted/30 group/task cursor-pointer transition-colors" onClick={() => onEditTask?.(task)}>
                                <div className={cn(labelColumnWidth, "flex-shrink-0 py-2 px-3 pl-14 flex items-center gap-2 border-r border-border/30")}>
                                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", styles.dot)} />
                                  <span className={cn("text-sm truncate flex-1", task.status === 'completed' && "line-through text-muted-foreground")}>{task.name}</span>
                                  <div className="flex gap-0.5 opacity-0 group-hover/task:opacity-100">
                                    {onEditTask && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEditTask(task); }}><Pencil className="w-3.5 h-3.5" /></Button>}
                                    {onDeleteTask && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); if(confirm('Excluir?')) onDeleteTask(task.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                  </div>
                                </div>
                                <div className="flex-1 relative h-10">
                                  <div className="absolute inset-0 flex pointer-events-none">{columns.map((_, i) => <div key={i} className={cn("flex-1 border-l border-border/10", columnWidth)} />)}</div>
                                  {position && <div className={cn("absolute top-2.5 h-5 rounded-md shadow-sm hover:shadow-md transition-all", styles.bg)} style={{ left: position.left, width: position.width, minWidth: '12px' }} />}
                                </div>
                              </div>
                            );
                          })}
                          {onAddTask && group.id !== 'unassigned' && (
                            <div className="flex items-center border-t border-border/20">
                              <div className={cn(labelColumnWidth, "flex-shrink-0 py-1.5 pl-14")}>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={(e) => { e.stopPropagation(); onAddTask(group.id); }}><Plus className="w-3.5 h-3.5 mr-1" />Nova tarefa</Button>
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
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500" /><span>Fase</span></div>
          <div className="flex items-center gap-2"><Diamond className="w-4 h-4 text-blue-500" style={{ fill: '#3b82f6' }} /><span>Marco</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span>Pendente</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span>Em Progresso</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span>Bloqueado</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span>Concluído</span></div>
          <div className="flex items-center gap-2"><div className="w-0.5 h-4 bg-primary rounded-full" /><span>Hoje</span></div>
        </div>
      </div>
    </TooltipProvider>
  );
};

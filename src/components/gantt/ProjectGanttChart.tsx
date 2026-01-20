import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { cn } from '@/lib/utils';
import { isTaskOverdue } from '@/lib/mockData';
import { Task, Person, Phase, Milestone } from '@/lib/types';
import { Flag, Plus, Diamond } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ZoomLevel = 'day' | 'week' | 'month';
type GroupBy = 'phase' | 'responsible' | 'status';

interface ProjectGanttChartProps {
  tasks: Task[];
  phases: Phase[];
  people: Person[];
  projectId: string;
  milestones?: Milestone[];
  onAddMilestone?: () => void;
}

export const ProjectGanttChart = ({ 
  tasks, 
  phases, 
  people, 
  projectId, 
  milestones = [],
  onAddMilestone,
}: ProjectGanttChartProps) => {
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [groupBy, setGroupBy] = useState<GroupBy>('phase');

  // Get milestones for this project
  const projectMilestones = useMemo(() => {
    return milestones.filter(m => m.projectId === projectId);
  }, [milestones, projectId]);

  // Filter phases for this project
  const projectPhases = useMemo(() => {
    return phases.filter(p => p.projectId === projectId).sort((a, b) => a.order - b.order);
  }, [phases, projectId]);

  // Calculate date range based on project tasks
  const dateRange = useMemo(() => {
    const dates = tasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean)) as string[];
    
    // Include milestone dates in range calculation
    const milestoneDates = projectMilestones
      .filter(m => !m.usePhaseEndDate && m.date)
      .map(m => m.date!);
    
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
    const cols: { date: Date; label: string }[] = [];
    const current = new Date(dateRange.start);
    
    while (current <= dateRange.end) {
      if (zoom === 'day') {
        cols.push({
          date: new Date(current),
          label: current.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        });
        current.setDate(current.getDate() + 1);
      } else if (zoom === 'week') {
        cols.push({
          date: new Date(current),
          label: `Sem ${Math.ceil(current.getDate() / 7)}`,
        });
        current.setDate(current.getDate() + 7);
      } else {
        cols.push({
          date: new Date(current),
          label: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        });
        current.setMonth(current.getMonth() + 1);
      }
    }
    return cols;
  }, [dateRange, zoom]);

  // Group tasks
  const groupedTasks = useMemo(() => {
    const groups: { id: string; name: string; color?: string; tasks: Task[] }[] = [];
    
    if (groupBy === 'phase') {
      projectPhases.forEach(phase => {
        const phaseTasks = tasks.filter(t => t.phaseId === phase.id);
        if (phaseTasks.length > 0) {
          groups.push({ id: phase.id, name: phase.name, color: phase.color, tasks: phaseTasks });
        }
      });
      const noPhase = tasks.filter(t => !t.phaseId);
      if (noPhase.length > 0) {
        groups.push({ id: 'no-phase', name: 'Sem Fase', tasks: noPhase });
      }
    } else if (groupBy === 'responsible') {
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
    } else if (groupBy === 'status') {
      const statusGroups = [
        { id: 'pending', name: 'Pendente', color: '#EAB308' },
        { id: 'in_progress', name: 'Em Progresso', color: '#3B82F6' },
        { id: 'blocked', name: 'Bloqueado', color: '#EF4444' },
        { id: 'completed', name: 'Concluído', color: '#22C55E' },
        { id: 'cancelled', name: 'Cancelado', color: '#6B7280' },
      ];
      statusGroups.forEach(sg => {
        const statusTasks = tasks.filter(t => t.status === sg.id);
        if (statusTasks.length > 0) {
          groups.push({ id: sg.id, name: sg.name, color: sg.color, tasks: statusTasks });
        }
      });
    }
    
    return groups;
  }, [tasks, projectPhases, people, groupBy]);

  // Calculate milestone date (either manual or from phase's last task)
  const getMilestoneDate = (milestone: Milestone): Date | null => {
    if (!milestone.usePhaseEndDate && milestone.date) {
      return new Date(milestone.date);
    }
    
    // Find the phase and get its last task's end date
    const phaseTasks = tasks.filter(t => t.phaseId === milestone.phaseId && t.endDate);
    if (phaseTasks.length === 0) return null;
    
    const lastEndDate = new Date(Math.max(...phaseTasks.map(t => new Date(t.endDate!).getTime())));
    return lastEndDate;
  };

  // Prepare milestones with calculated dates for timeline
  const milestonesWithDates = useMemo(() => {
    return projectMilestones
      .map(m => ({
        ...m,
        calculatedDate: getMilestoneDate(m),
      }))
      .filter(m => m.calculatedDate !== null)
      .sort((a, b) => a.calculatedDate!.getTime() - b.calculatedDate!.getTime());
  }, [projectMilestones, tasks]);

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
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
  };

  const getDatePosition = (date: Date) => {
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
  };

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Nenhuma tarefa com datas definidas neste projeto</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="phase">Fase</SelectItem>
              <SelectItem value="responsible">Responsável</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          
          {onAddMilestone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onAddMilestone}
                    disabled={projectPhases.length === 0}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Novo Marco
                  </Button>
                </span>
              </TooltipTrigger>
              {projectPhases.length === 0 && (
                <TooltipContent>
                  <p>Cadastre pelo menos uma fase/sprint para adicionar marcos</p>
                </TooltipContent>
              )}
            </Tooltip>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground mr-2">Zoom:</span>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={zoom === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoom('day')}
              className="rounded-none"
            >
              Dia
            </Button>
            <Button
              variant={zoom === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoom('week')}
              className="rounded-none"
            >
              Semana
            </Button>
            <Button
              variant={zoom === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setZoom('month')}
              className="rounded-none"
            >
              Mês
            </Button>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="flex border-b border-border">
              <div className="w-56 flex-shrink-0 p-4 bg-muted/50 font-medium text-sm text-muted-foreground">
                {groupBy === 'phase' ? 'Fase' : 
                 groupBy === 'responsible' ? 'Responsável' : 'Status'}
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

            {/* Milestone Timeline Row - Continuous Line */}
            {milestonesWithDates.length > 0 && (
              <div className="flex border-b border-border bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-900/20 dark:to-orange-900/20">
                <div className="w-56 flex-shrink-0 p-3 font-medium text-sm flex items-center gap-2 bg-amber-100/50 dark:bg-amber-900/30">
                  <Flag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-800 dark:text-amber-300">Marcos</span>
                  <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                    ({milestonesWithDates.length})
                  </span>
                </div>
                <div className="flex-1 relative h-14">
                  {/* Continuous connecting line */}
                  {milestonesWithDates.length > 1 && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400"
                      style={{
                        left: getDatePosition(milestonesWithDates[0].calculatedDate!),
                        width: `calc(${getDatePosition(milestonesWithDates[milestonesWithDates.length - 1].calculatedDate!)} - ${getDatePosition(milestonesWithDates[0].calculatedDate!)})`,
                      }}
                    />
                  )}
                  
                  {/* Milestone markers */}
                  {milestonesWithDates.map((milestone, index) => {
                    const phase = projectPhases.find(p => p.id === milestone.phaseId);
                    return (
                      <Tooltip key={milestone.id}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer transition-all hover:scale-125"
                            style={{
                              left: getDatePosition(milestone.calculatedDate!),
                            }}
                          >
                            <div 
                              className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 shadow-lg flex items-center justify-center"
                              style={{ 
                                backgroundColor: milestone.color || '#EAB308',
                              }}
                            >
                              <Diamond className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">{milestone.name}</p>
                            {phase && (
                              <p className="text-xs flex items-center gap-1">
                                <span 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: phase.color }} 
                                />
                                {phase.name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {milestone.calculatedDate!.toLocaleDateString('pt-BR')}
                            </p>
                            {milestone.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="relative">
              {/* Today line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                style={{ left: getTodayPosition() }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary" />
              </div>

              {groupedTasks.map((group) => (
                <div key={group.id}>
                  {/* Group Header */}
                  <div className="flex border-b border-border bg-muted/30">
                    <div className="w-56 flex-shrink-0 p-3 font-medium text-sm flex items-center gap-2">
                      {group.color && (
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      <span className="truncate">{group.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">({group.tasks.length})</span>
                    </div>
                    <div className="flex-1" />
                  </div>

                  {/* Tasks */}
                  {group.tasks.map((task) => {
                    const position = getTaskPosition(task);
                    const overdue = isTaskOverdue(task);
                    const person = people.find(p => p.id === task.responsibleId);

                    return (
                      <div key={task.id} className="flex border-b border-border/50 hover:bg-muted/20">
                        <div className="w-56 flex-shrink-0 p-3 text-sm flex items-center gap-2">
                          {person && <AvatarCircle name={person.name} color={person.color} size="sm" />}
                          <span className={cn("truncate", overdue && "text-status-blocked")}>
                            {task.name}
                          </span>
                        </div>
                        <div className="flex-1 relative h-12">
                          {position && (
                            <div
                              className={cn(
                                "absolute top-2 h-8 rounded-md cursor-pointer transition-all hover:shadow-md",
                                overdue ? "bg-status-blocked" : 
                                task.status === 'completed' ? "bg-status-completed" :
                                task.status === 'in_progress' ? "bg-status-progress" :
                                task.status === 'blocked' ? "bg-status-blocked" :
                                "bg-status-pending"
                              )}
                              style={{
                                left: position.left,
                                width: position.width,
                                minWidth: '20px',
                              }}
                            >
                              <div className="h-full flex items-center px-2 text-xs text-white font-medium truncate">
                                {task.name}
                              </div>
                            </div>
                          )}

                          {/* Sprint marker */}
                          {task.sprintDate && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 transform rotate-45 z-20"
                              style={{
                                left: `${((new Date(task.sprintDate).getTime() - dateRange.start.getTime()) / (dateRange.end.getTime() - dateRange.start.getTime())) * 100}%`,
                              }}
                              title={`Sprint: ${new Date(task.sprintDate).toLocaleDateString('pt-BR')}`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
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
          <div className="w-4 h-4 bg-purple-500 transform rotate-45" />
          <span>Sprint</span>
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

import { useState, useMemo, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isTaskOverdue, calculatePercentage } from '@/lib/mockData';
import { Task, Person, Milestone, Phase, Project } from '@/lib/types';
import { Pencil, Trash2, CheckCircle2, ChevronDown, ChevronRight, Calendar, CalendarDays, CalendarRange, Diamond, Layers, Info, LocateFixed } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarCircle } from '@/components/ui/avatar-circle';

type ZoomLevel = 'day' | 'week' | 'month';

interface ProjectGanttChartProps {
  tasks: Task[];
  people: Person[];
  projectId: string;
  project?: Project;
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
  project,
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
  const [showPhasesSection, setShowPhasesSection] = useState(true);
  const labelsRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const projectPhases = useMemo(() => phases.filter(p => p.projectId === projectId), [phases, projectId]);
  const projectMilestones = useMemo(() => milestones.filter(m => m.projectId === projectId), [milestones, projectId]);

  // Helper para obter data atual em São Paulo (normalizada ao meio-dia UTC para alinhar com datas do banco)
  const getTodaySaoPaulo = () => {
    const now = new Date();
    // Obter a data no timezone de São Paulo
    const spFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = spFormatter.format(now); // "YYYY-MM-DD"
    // Criar a data como UTC meio-dia para alinhar com as datas do banco (que são "YYYY-MM-DD" parseadas como UTC)
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  };

  const dateRange = useMemo(() => {
    const today = getTodaySaoPaulo();
    const dates = tasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean)) as string[];
    const phaseDates = projectPhases.flatMap(p => [p.startDate, p.endDate].filter(Boolean)) as string[];
    const milestoneDates = projectMilestones.map(m => m.date).filter(Boolean) as string[];

    // Include project start and end dates
    const projectDates = [project?.startDate, project?.endDate].filter(Boolean) as string[];

    const allDates = [...dates, ...phaseDates, ...milestoneDates, ...projectDates];

    if (allDates.length === 0) {
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0)
      };
    }

    const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));

    // Start from the earliest date (project start) with some padding
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 7); // 1 week before earliest date

    // End after the latest date or today, whichever is later
    const endDate = new Date(Math.max(maxDate.getTime(), today.getTime()));
    endDate.setDate(endDate.getDate() + 14); // 2 weeks after latest date

    return { start: startDate, end: endDate };
  }, [tasks, projectPhases, projectMilestones, project]);

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
    const today = getTodaySaoPaulo();
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
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

  // Sync scroll between labels and chart
  const handleChartScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (labelsRef.current) {
      labelsRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const handleLabelsScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (chartRef.current) {
      chartRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  // Scroll to today position
  const scrollToToday = useCallback(() => {
    const today = getTodaySaoPaulo();
    const columnWidthPx = zoom === 'day' ? 40 : zoom === 'week' ? 100 : 120;

    // Find the column index for today
    const todayIndex = columns.findIndex(col => {
      if (zoom === 'day') {
        return col.date.toDateString() === today.toDateString();
      } else if (zoom === 'week') {
        const weekEnd = new Date(col.date);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return today >= col.date && today <= weekEnd;
      } else {
        return col.date.getMonth() === today.getMonth() && col.date.getFullYear() === today.getFullYear();
      }
    });

    if (todayIndex !== -1 && chartRef.current && headerScrollRef.current) {
      // Calculate scroll position to center today on screen
      const chartWidth = chartRef.current.clientWidth;
      const scrollPosition = Math.max(0, (todayIndex * columnWidthPx) - (chartWidth / 2) + (columnWidthPx / 2));

      chartRef.current.scrollLeft = scrollPosition;
      headerScrollRef.current.scrollLeft = scrollPosition;
    }
  }, [columns, zoom]);

  const columnWidth = zoom === 'day' ? 'min-w-[40px]' : zoom === 'week' ? 'min-w-[100px]' : 'min-w-[120px]';
  const chartMinWidth = zoom === 'day' ? `${columns.length * 40}px` : zoom === 'week' ? `${columns.length * 100}px` : `${columns.length * 120}px`;
  const labelColumnWidthPx = 320;

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

  // Row heights for consistency - compact vertical spacing
  const headerHeight = 'h-[40px]';
  const sectionHeaderHeight = 'h-[22px]';
  const phaseRowHeight = 'h-[20px]';
  const groupHeaderHeight = 'h-[36px]';
  const taskRowHeight = 'h-[24px]';

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            {onAddPhase && <Button variant="outline" onClick={onAddPhase} className="h-9"><Layers className="w-4 h-4 mr-2" />Nova Fase</Button>}
            {onAddMilestone && <Button variant="outline" onClick={onAddMilestone} className="h-9"><Diamond className="w-4 h-4 mr-2" />Novo Marco</Button>}
          </div>

          <div className="flex items-center gap-3">
            {/* Go to Today Button */}
            <Button variant="outline" size="sm" onClick={scrollToToday} className="h-8 px-3">
              <LocateFixed className="w-4 h-4 mr-1.5" />
              Hoje
            </Button>

            {/* Legend Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground">
                  <Info className="w-4 h-4 mr-1.5" />
                  Legenda
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-3">
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500" /><span className="text-muted-foreground">Fase</span></div>
                  <div className="flex items-center gap-2"><Diamond className="w-4 h-4 text-blue-500" style={{ fill: '#3b82f6' }} /><span className="text-muted-foreground">Marco</span></div>
                  <div className="border-t my-2" />
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-muted-foreground">Pendente</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-muted-foreground">Em Progresso</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-muted-foreground">Bloqueado/Atrasado</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-muted-foreground">Concluído</span></div>
                  <div className="border-t my-2" />
                  <div className="flex items-center gap-2"><div className="w-0.5 h-4 bg-primary rounded-full" /><span className="text-muted-foreground">Hoje</span></div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button variant={zoom === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setZoom('day')} className="h-8 px-3 text-sm"><CalendarDays className="w-4 h-4 mr-1.5" />Dia</Button>
              <Button variant={zoom === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setZoom('week')} className="h-8 px-3 text-sm"><Calendar className="w-4 h-4 mr-1.5" />Semana</Button>
              <Button variant={zoom === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setZoom('month')} className="h-8 px-3 text-sm"><CalendarRange className="w-4 h-4 mr-1.5" />Mês</Button>
            </div>
          </div>
        </div>

        {/* Gantt Chart - Two Column Layout */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Fixed Header Row */}
          <div className="flex w-full border-b border-border">
            {/* Label Column Header */}
            <div
              className="flex-shrink-0 border-r border-border bg-muted/40"
              style={{ width: labelColumnWidthPx }}
            >
              <div className={cn(headerHeight, "px-4 font-medium text-sm text-muted-foreground flex items-center gap-2")}>
                <span>Tarefas</span>
              </div>
            </div>
            {/* Chart Header with Timeline - Scrollable horizontally */}
            <div
              ref={headerScrollRef}
              className="flex-1 overflow-x-auto min-w-0"
              style={{ scrollbarWidth: 'none' }}
              onScroll={(e) => {
                if (chartRef.current) {
                  chartRef.current.scrollLeft = e.currentTarget.scrollLeft;
                }
              }}
            >
              <div className={cn(headerHeight, "flex bg-muted/40 relative")} style={{ minWidth: chartMinWidth }}>
                {/* Today Line in header */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                  style={{ left: getTodayPosition() }}
                >
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-t shadow-md whitespace-nowrap">
                    Hoje
                  </div>
                </div>
                {columns.map((col, i) => {
                  const today = getTodaySaoPaulo();
                  const isToday = zoom !== 'month' && col.date.toDateString() === today.toDateString();
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 py-2 text-center border-l border-border/30 flex flex-col justify-center",
                        columnWidth,
                        isToday && "bg-primary/10"
                      )}
                    >
                      {col.subLabel && <span className="text-[10px] text-muted-foreground uppercase">{col.subLabel}</span>}
                      <span className={cn("font-medium", zoom === 'day' ? "text-xs" : "text-sm", isToday && "text-primary font-semibold")}>{col.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex w-full" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            {/* Left Column - Labels */}
            <div
              ref={labelsRef}
              className="flex-shrink-0 border-r border-border bg-card overflow-y-auto"
              style={{ width: labelColumnWidthPx, scrollbarWidth: 'none' }}
              onScroll={handleLabelsScroll}
            >

              {/* Fases e Marcos Section */}
              {(projectPhases.length > 0 || projectMilestones.length > 0) && (
                <div className="border-b border-border">
                  {/* Section Header */}
                  <div
                    className={cn(sectionHeaderHeight, "flex items-center cursor-pointer hover:bg-muted/30 transition-colors bg-muted/20 px-3")}
                    onClick={() => setShowPhasesSection(!showPhasesSection)}
                  >
                    <button className="p-0.5 rounded hover:bg-muted">
                      {showPhasesSection ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                    <Layers className="w-3.5 h-3.5 text-amber-600 ml-2" />
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 ml-2">Fases e Marcos</span>
                    <span className="text-[10px] text-muted-foreground ml-1">({projectPhases.length + projectMilestones.length})</span>
                  </div>

                  {showPhasesSection && (
                    <>
                      {/* Phase Labels */}
                      {projectPhases.map((phase) => {
                        const phaseColor = phase.color || '#f59e0b';
                        return (
                          <div key={phase.id} className={cn(phaseRowHeight, "group flex items-center px-3 pl-10 hover:bg-muted/20 transition-colors")}>
                            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 shadow-sm" style={{ backgroundColor: phaseColor }} />
                            <span className="text-xs truncate flex-1 ml-2">{phase.name}</span>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onEditPhase && <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); onEditPhase(phase); }}><Pencil className="w-2.5 h-2.5" /></Button>}
                              {onDeletePhase && <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={(e) => { e.stopPropagation(); if(confirm('Excluir fase?')) onDeletePhase(phase.id); }}><Trash2 className="w-2.5 h-2.5" /></Button>}
                            </div>
                          </div>
                        );
                      })}

                      {/* Milestones Label */}
                      {projectMilestones.length > 0 && (
                        <div className={cn(phaseRowHeight, "flex items-center px-3 pl-10 hover:bg-muted/20 transition-colors")}>
                          <Diamond className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" style={{ fill: '#3b82f6' }} />
                          <span className="text-xs text-muted-foreground ml-2">Marcos</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({projectMilestones.length})</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Task Groups */}
              {groupedTasks.length === 0 && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">Nenhuma tarefa</p>
                </div>
              )}

              {groupedTasks.map((group) => {
                const isCollapsed = collapsedGroups.has(group.id);
                const completedCount = group.tasks.filter(t => t.status === 'completed').length;
                const progress = Math.round((completedCount / group.tasks.length) * 100);
                const person = people.find(p => p.id === group.id);

                return (
                  <div key={group.id} className="border-b border-border/50 last:border-b-0">
                    {/* Group Header */}
                    <div
                      className={cn(groupHeaderHeight, "flex items-center cursor-pointer hover:bg-muted/40 transition-colors bg-muted/20 px-2")}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <button className="p-0.5 rounded hover:bg-muted">
                        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                      {person ? (
                        <AvatarCircle name={person.name} color={person.color} size="sm" avatarUrl={person.avatarUrl} />
                      ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm bg-muted-foreground ml-1">
                          {group.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 ml-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold truncate">{group.name}</p>
                          <span className="text-[10px] text-muted-foreground">({group.tasks.length})</span>
                          <div className="flex-1 h-1 bg-muted rounded-full max-w-[40px] overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] font-medium text-emerald-600">{progress}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Task Labels */}
                    {!isCollapsed && group.tasks.map((task) => {
                      const styles = getStatusStyles(task);
                      return (
                        <div
                          key={task.id}
                          className={cn(taskRowHeight, "flex items-center hover:bg-muted/30 transition-colors px-4 pl-8")}
                        >
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", styles.dot)} />
                          <span className={cn("text-sm truncate flex-1 ml-2", task.status === 'completed' && "line-through text-muted-foreground")}>
                            {task.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Right Column - Chart (Scrollable horizontally and vertically) */}
            <div
              ref={chartRef}
              className="flex-1 overflow-auto min-w-0"
              onScroll={(e) => {
                handleChartScroll(e);
                // Sync header horizontal scroll
                if (headerScrollRef.current) {
                  headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                }
              }}
            >
              <div style={{ minWidth: chartMinWidth }}>
                {/* Fases e Marcos Section */}
                {(projectPhases.length > 0 || projectMilestones.length > 0) && (
                  <div className="border-b border-border">
                    {/* Section Header Row */}
                    <div className={cn(sectionHeaderHeight, "relative bg-muted/20")}>
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                        style={{ left: getTodayPosition() }}
                      />
                    </div>

                    {showPhasesSection && (
                      <>
                        {/* Phase Bars */}
                        {projectPhases.map((phase) => {
                          const position = getPosition(phase.startDate, phase.endDate);
                          const phaseColor = phase.color || '#f59e0b';
                          return (
                            <div key={phase.id} className={cn(phaseRowHeight, "relative")}>
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                                style={{ left: getTodayPosition() }}
                              />
                              <div className="absolute inset-0 flex pointer-events-none">
                                {columns.map((_, i) => <div key={i} className={cn("flex-1 border-l border-border/10", columnWidth)} />)}
                              </div>
                              {position && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="absolute top-1 h-4 rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                                      style={{ left: position.left, width: position.width, minWidth: '24px', backgroundColor: phaseColor }}
                                    >
                                      <div className="h-full flex items-center px-1.5 text-[10px] text-white font-medium truncate">
                                        {phase.name}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-medium">{phase.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {phase.startDate && new Date(phase.startDate).toLocaleDateString('pt-BR')}
                                      {phase.endDate && ` → ${new Date(phase.endDate).toLocaleDateString('pt-BR')}`}
                                    </p>
                                    {phase.description && <p className="text-xs mt-1">{phase.description}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          );
                        })}

                        {/* Milestones Row */}
                        {projectMilestones.length > 0 && (
                          <div className={cn(phaseRowHeight, "relative")}>
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                              style={{ left: getTodayPosition() }}
                            />
                            <div className="absolute inset-0 flex pointer-events-none">
                              {columns.map((_, i) => <div key={i} className={cn("flex-1 border-l border-border/10", columnWidth)} />)}
                            </div>
                            {projectMilestones.map(m => {
                              const milestoneColor = m.color || '#3b82f6';
                              const milestonePos = getMilestonePosition(m.date);
                              return (
                                <Popover key={m.id}>
                                  <PopoverTrigger asChild>
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer hover:scale-125 transition-transform z-10"
                                      style={{ left: milestonePos }}
                                    >
                                      <div className="relative">
                                        <Diamond
                                          className="w-4 h-4 drop-shadow-md"
                                          style={{ fill: milestoneColor, color: milestoneColor }}
                                        />
                                        {m.completed && <CheckCircle2 className="w-2.5 h-2.5 absolute -top-0.5 -right-0.5 text-emerald-500 bg-white rounded-full" />}
                                      </div>
                                    </div>
                                  </PopoverTrigger>
                                  <PopoverContent side="top" className="w-64 p-3">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Diamond className="w-4 h-4" style={{ fill: milestoneColor, color: milestoneColor }} />
                                        <p className="font-semibold">{m.name}</p>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                      {m.description && <p className="text-sm text-muted-foreground">{m.description}</p>}
                                      <div className="flex items-center gap-2 pt-2 border-t">
                                        <Checkbox id={`m-${m.id}`} checked={m.completed} onCheckedChange={(c) => onUpdateMilestone?.(m.id, { completed: !!c })} />
                                        <label htmlFor={`m-${m.id}`} className="text-sm cursor-pointer">Marcar como concluído</label>
                                      </div>
                                      <div className="flex gap-1 pt-2">
                                        {onEditMilestone && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEditMilestone(m)}><Pencil className="w-3 h-3 mr-1" />Editar</Button>}
                                        {onDeleteMilestone && <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => { if(confirm('Excluir marco?')) onDeleteMilestone(m.id); }}><Trash2 className="w-3 h-3 mr-1" />Excluir</Button>}
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Task Groups Chart */}
                {groupedTasks.map((group) => {
                  const isCollapsed = collapsedGroups.has(group.id);

                  return (
                    <div key={group.id} className="border-b border-border/50 last:border-b-0">
                      {/* Group Header Row */}
                      <div className={cn(groupHeaderHeight, "relative bg-muted/20")}>
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                          style={{ left: getTodayPosition() }}
                        />
                      </div>

                      {/* Task Bars */}
                      {!isCollapsed && group.tasks.map((task) => {
                        const position = getPosition(task.startDate, task.endDate);
                        const styles = getStatusStyles(task);
                        const taskProgress = calculatePercentage(task);

                        return (
                          <div key={task.id} className={cn(taskRowHeight, "relative")}>
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-primary z-20 pointer-events-none"
                              style={{ left: getTodayPosition() }}
                            />
                            <div className="absolute inset-0 flex pointer-events-none">
                              {columns.map((_, i) => <div key={i} className={cn("flex-1 border-l border-border/10", columnWidth)} />)}
                            </div>
                            {position && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn("absolute top-[5px] h-[14px] rounded shadow-sm hover:shadow-md transition-all overflow-hidden", styles.bg)}
                                    style={{ left: position.left, width: position.width, minWidth: '12px' }}
                                  >
                                    {taskProgress > 0 && taskProgress < 100 && (
                                      <div
                                        className="absolute inset-y-0 left-0 bg-white/20"
                                        style={{ width: `${taskProgress}%` }}
                                      />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-medium">{task.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {task.startDate && new Date(task.startDate).toLocaleDateString('pt-BR')}
                                    {task.endDate && ` → ${new Date(task.endDate).toLocaleDateString('pt-BR')}`}
                                  </p>
                                  {taskProgress > 0 && <p className="text-xs">Progresso: {taskProgress}%</p>}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

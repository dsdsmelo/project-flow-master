import { useState, useMemo } from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { isTaskOverdue } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarCircle } from '@/components/ui/avatar-circle';

type ZoomLevel = 'day' | 'week' | 'month';
type GroupBy = 'project' | 'responsible';

const Gantt = () => {
  const { tasks, projects, people } = useData();
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [groupBy, setGroupBy] = useState<GroupBy>('project');

  // Calculate date range
  const dateRange = useMemo(() => {
    const dates = tasks.flatMap(t => [t.startDate, t.endDate].filter(Boolean)) as string[];
    if (dates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 2, 0),
      };
    }
    const startDate = new Date(Math.min(...dates.map(d => new Date(d).getTime())));
    const endDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() + 7);
    return { start: startDate, end: endDate };
  }, [tasks]);

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
    const groups: { id: string; name: string; color?: string; tasks: typeof tasks }[] = [];
    
    if (groupBy === 'project') {
      projects.forEach(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        if (projectTasks.length > 0) {
          groups.push({ id: project.id, name: project.name, tasks: projectTasks });
        }
      });
    } else if (groupBy === 'responsible') {
      people.forEach(person => {
        const personTasks = tasks.filter(t => t.responsibleId === person.id);
        if (personTasks.length > 0) {
          groups.push({ id: person.id, name: person.name, color: person.color, tasks: personTasks });
        }
      });
      const unassigned = tasks.filter(t => !t.responsibleId);
      if (unassigned.length > 0) {
        groups.push({ id: 'unassigned', name: 'Sem Responsável', tasks: unassigned });
      }
    }
    
    return groups;
  }, [tasks, projects, people, groupBy]);

  const getTaskPosition = (task: typeof tasks[0]) => {
    if (!task.startDate || !task.endDate) return null;
    
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const startOffset = (start.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const getTodayPosition = () => {
    const today = new Date();
    const totalDays = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const offset = (today.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return `${(offset / totalDays) * 100}%`;
  };

  return (
    <MainLayout>
      <Header title="Gráfico Gantt" subtitle="Visualização temporal das tarefas" />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-3">
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Agrupar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Projeto</SelectItem>
                <SelectItem value="responsible">Responsável</SelectItem>
              </SelectContent>
            </Select>
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
            <div className="min-w-[1000px]">
              {/* Header */}
              <div className="flex border-b border-border">
                <div className="w-64 flex-shrink-0 p-4 bg-muted/50 font-medium text-sm text-muted-foreground">
                  {groupBy === 'project' ? 'Projeto' : 'Responsável'}
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
                      <div className="w-64 flex-shrink-0 p-3 font-medium text-sm flex items-center gap-2">
                        {group.color && (
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                        )}
                        {group.name}
                        <span className="text-xs text-muted-foreground">({group.tasks.length})</span>
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
                          <div className="w-64 flex-shrink-0 p-3 text-sm flex items-center gap-2">
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
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-purple-500 transform rotate-45"
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
            <div className="w-1 h-4 bg-primary rounded" />
            <span>Hoje</span>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Gantt;

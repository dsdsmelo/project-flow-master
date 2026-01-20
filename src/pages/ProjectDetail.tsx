import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  ListTodo,
  FolderKanban,
  GanttChart,
  LayoutDashboard,
  Plus,
  ClipboardList
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { calculatePercentage, isTaskOverdue, isTaskDueSoon } from '@/lib/mockData';
import { projectStatusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProjectGanttChart } from '@/components/gantt/ProjectGanttChart';
import { TaskFormModal } from '@/components/modals/TaskFormModal';
import { ProjectTasksTable } from '@/components/tasks/ProjectTasksTable';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const statusColors = {
  planning: 'bg-purple-500',
  active: 'bg-status-completed',
  paused: 'bg-status-pending',
  completed: 'bg-status-progress',
  cancelled: 'bg-status-cancelled',
};

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, tasks, people, phases, cells, customColumns, loading, error } = useData();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const project = useMemo(() => {
    return projects.find(p => p.id === projectId);
  }, [projects, projectId]);

  const projectTasks = useMemo(() => {
    return tasks.filter(t => t.projectId === projectId);
  }, [tasks, projectId]);

  const projectPhases = useMemo(() => {
    return phases.filter(p => p.projectId === projectId).sort((a, b) => a.order - b.order);
  }, [phases, projectId]);

  const stats = useMemo(() => {
    const pending = projectTasks.filter(t => t.status === 'pending').length;
    const inProgress = projectTasks.filter(t => t.status === 'in_progress').length;
    const completed = projectTasks.filter(t => t.status === 'completed').length;
    const blocked = projectTasks.filter(t => t.status === 'blocked').length;
    const total = projectTasks.length;
    const avgProgress = total > 0 
      ? Math.round(projectTasks.reduce((acc, t) => acc + calculatePercentage(t), 0) / total)
      : 0;

    return { pending, inProgress, completed, blocked, total, avgProgress };
  }, [projectTasks]);

  const statusDistribution = useMemo(() => {
    return [
      { name: 'Pendente', value: stats.pending, color: '#EAB308' },
      { name: 'Em Progresso', value: stats.inProgress, color: '#3B82F6' },
      { name: 'Bloqueado', value: stats.blocked, color: '#EF4444' },
      { name: 'Concluído', value: stats.completed, color: '#22C55E' },
    ];
  }, [stats]);

  // Get milestone columns for this project
  const milestoneColumns = useMemo(() => {
    return customColumns.filter(col => col.projectId === projectId && col.isMilestone && col.active);
  }, [customColumns, projectId]);

  // Get milestone data from tasks
  const milestonesData = useMemo(() => {
    const data: Array<{
      columnName: string;
      columnType: string;
      tasks: Array<{
        taskName: string;
        value: string | number | undefined;
        status: string;
      }>;
    }> = [];

    milestoneColumns.forEach(col => {
      const tasksWithMilestone = projectTasks
        .filter(task => task.customValues && task.customValues[col.id] !== undefined && task.customValues[col.id] !== '')
        .map(task => ({
          taskName: task.name,
          value: task.customValues?.[col.id],
          status: task.status,
        }));

      if (tasksWithMilestone.length > 0 || true) {
        data.push({
          columnName: col.name,
          columnType: col.type,
          tasks: tasksWithMilestone,
        });
      }
    });

    return data;
  }, [milestoneColumns, projectTasks]);

  const tasksByPerson = useMemo(() => {
    const personMap = new Map<string, { name: string; color: string; tasks: number }>();
    
    projectTasks.forEach(task => {
      if (task.responsibleId) {
        const person = people.find(p => p.id === task.responsibleId);
        if (person) {
          const existing = personMap.get(person.id);
          if (existing) {
            existing.tasks++;
          } else {
            personMap.set(person.id, {
              name: person.name.split(' ')[0],
              color: person.color,
              tasks: 1,
            });
          }
        }
      }
    });

    return Array.from(personMap.values()).sort((a, b) => b.tasks - a.tasks);
  }, [projectTasks, people]);

  const alerts = useMemo(() => {
    const overdue = projectTasks.filter(isTaskOverdue);
    const dueSoon = projectTasks.filter(isTaskDueSoon);
    const unassigned = projectTasks.filter(t => !t.responsibleId && t.status !== 'completed' && t.status !== 'cancelled');
    return { overdue, dueSoon, unassigned };
  }, [projectTasks]);


  const getPersonName = (personId?: string) => {
    if (!personId) return null;
    return people.find(p => p.id === personId);
  };

  const getPhaseName = (phaseId?: string) => {
    if (!phaseId) return '-';
    return phases.find(p => p.id === phaseId)?.name || '-';
  };

  const getCellName = (cellId?: string) => {
    if (!cellId) return '-';
    return cells.find(c => c.id === cellId)?.name || '-';
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Carregando..." subtitle="" />
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
        <Header title="Erro" subtitle="" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-destructive">
            <p className="font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!project) {
    return (
      <MainLayout>
        <Header title="Projeto não encontrado" subtitle="" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FolderKanban className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Projeto não encontrado</h3>
            <p className="text-muted-foreground mb-4">O projeto que você está procurando não existe.</p>
            <Button onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Projetos
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title={project.name} 
        subtitle={project.description || 'Dashboard do projeto'}
      />
      
      <div className="p-6 space-y-6">
        {/* Back button and project info */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Projetos
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', statusColors[project.status])} />
              <span className="text-sm font-medium">{projectStatusLabels[project.status]}</span>
            </div>
            {project.startDate && project.endDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(project.startDate).toLocaleDateString('pt-BR')} - {new Date(project.endDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <Button className="gradient-primary text-white" onClick={() => setTaskModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-12 p-1 bg-muted/80 border border-border rounded-xl shadow-sm w-full max-w-xl">
            <TabsTrigger 
              value="dashboard" 
              className="flex-1 h-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="tasks" 
              className="flex-1 h-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              Tarefas
            </TabsTrigger>
            <TabsTrigger 
              value="gantt" 
              className="flex-1 h-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all"
            >
              <GanttChart className="w-4 h-4" />
              Gantt
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total de Tarefas"
            value={stats.total}
            icon={ListTodo}
            variant="default"
          />
          <StatCard
            title="Pendentes"
            value={stats.pending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Em Progresso"
            value={stats.inProgress}
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Concluídas"
            value={stats.completed}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Progresso Geral"
            value={`${stats.avgProgress}%`}
            icon={TrendingUp}
            variant="primary"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Milestones */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">Marcos do Projeto</h3>
            </div>
            {milestonesData.length > 0 ? (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {milestonesData.map((milestone, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-primary">{milestone.columnName}</span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                        {milestone.tasks.length} {milestone.tasks.length === 1 ? 'tarefa' : 'tarefas'}
                      </span>
                    </div>
                    {milestone.tasks.length > 0 ? (
                      <div className="grid gap-2">
                        {milestone.tasks.slice(0, 5).map((task, taskIdx) => (
                          <div 
                            key={taskIdx} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-2 h-2 rounded-full',
                                task.status === 'completed' ? 'bg-status-completed' :
                                task.status === 'in_progress' ? 'bg-status-progress' :
                                task.status === 'blocked' ? 'bg-status-blocked' : 'bg-status-pending'
                              )} />
                              <span className="text-sm font-medium">{task.taskName}</span>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                              {milestone.columnType === 'date' && task.value
                                ? new Date(task.value as string).toLocaleDateString('pt-BR')
                                : milestone.columnType === 'percentage'
                                ? `${task.value}%`
                                : task.value}
                            </span>
                          </div>
                        ))}
                        {milestone.tasks.length > 5 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{milestone.tasks.length - 5} outras tarefas
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma tarefa com este marco definido
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Calendar className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-center">Nenhum marco configurado</p>
                <p className="text-xs text-center mt-1">
                  Marque colunas como "Marco" nas configurações do projeto
                </p>
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Distribuição por Status</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tasks by Person & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks by Person */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Tarefas por Responsável</h3>
            {tasksByPerson.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksByPerson}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                      {tasksByPerson.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>Nenhuma tarefa atribuída</p>
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Alertas do Projeto</h3>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {alerts.overdue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-status-blocked">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">Tarefas Atrasadas ({alerts.overdue.length})</span>
                  </div>
                  {alerts.overdue.slice(0, 3).map(task => (
                    <Link 
                      key={task.id} 
                      to={`/tasks?highlight=${task.id}&project=${projectId}`}
                      className="block p-3 bg-status-blocked/5 border border-status-blocked/20 rounded-lg hover:bg-status-blocked/10 transition-colors"
                    >
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getPhaseName(task.phaseId)}</p>
                    </Link>
                  ))}
                </div>
              )}

              {alerts.dueSoon.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-status-pending">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium text-sm">Próximos do Prazo ({alerts.dueSoon.length})</span>
                  </div>
                  {alerts.dueSoon.slice(0, 3).map(task => (
                    <Link 
                      key={task.id} 
                      to={`/tasks?highlight=${task.id}&project=${projectId}`}
                      className="block p-3 bg-status-pending/5 border border-status-pending/20 rounded-lg hover:bg-status-pending/10 transition-colors"
                    >
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getPhaseName(task.phaseId)}</p>
                    </Link>
                  ))}
                </div>
              )}

              {alerts.unassigned.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="font-medium text-sm">Sem Responsável ({alerts.unassigned.length})</span>
                  </div>
                  {alerts.unassigned.slice(0, 3).map(task => (
                    <Link 
                      key={task.id} 
                      to={`/tasks?highlight=${task.id}&project=${projectId}`}
                      className="block p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getPhaseName(task.phaseId)}</p>
                    </Link>
                  ))}
                </div>
              )}

              {alerts.overdue.length === 0 && alerts.dueSoon.length === 0 && alerts.unassigned.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>Nenhum alerta no momento 🎉</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Phases List */}
        {projectPhases.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Fases do Projeto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectPhases.map(phase => {
                const phaseTasks = projectTasks.filter(t => t.phaseId === phase.id);
                const progress = phaseTasks.length > 0
                  ? Math.round(phaseTasks.reduce((acc, t) => acc + calculatePercentage(t), 0) / phaseTasks.length)
                  : 0;
                const completed = phaseTasks.filter(t => t.status === 'completed').length;

                return (
                  <div 
                    key={phase.id} 
                    className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    style={{ borderLeftColor: phase.color, borderLeftWidth: 4 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{phase.name}</h4>
                      <span className="text-xs text-muted-foreground">
                        {completed}/{phaseTasks.length} concluídas
                      </span>
                    </div>
                    <ProgressBar value={progress} size="sm" showLabel />
                  </div>
                );
              })}
            </div>
          </div>
        )}

          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-6">
            <ProjectTasksTable projectId={projectId || ''} />
          </TabsContent>

          {/* Gantt Tab */}
          <TabsContent value="gantt" className="mt-6">
            <ProjectGanttChart 
              tasks={projectTasks} 
              phases={projectPhases} 
              people={people} 
              projectId={projectId || ''} 
              customColumns={customColumns}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Modal */}
      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={setTaskModalOpen}
        defaultProjectId={projectId}
      />
    </MainLayout>
  );
};

export default ProjectDetail;

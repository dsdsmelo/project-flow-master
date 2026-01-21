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
  ClipboardList,
  Layers,
  FileText
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { calculatePercentage, isTaskOverdue, isTaskDueSoon } from '@/lib/mockData';
import { projectStatusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ProjectGanttChart } from '@/components/gantt/ProjectGanttChart';
import { TaskFormModal } from '@/components/modals/TaskFormModal';
import { MilestoneFormModal } from '@/components/modals/MilestoneFormModal';
import { PhaseFormModal } from '@/components/modals/PhaseFormModal';
import { ProjectTasksTable } from '@/components/tasks/ProjectTasksTable';
import { PhaseManagerSheet } from '@/components/phases/PhaseManagerSheet';
import { MeetingNotesTab } from '@/components/meetings/MeetingNotesTab';
import { Phase } from '@/lib/types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const { projects, tasks, people, phases, cells, customColumns, milestones, deleteMilestone, updateMilestone, deletePhase, loading, error } = useData();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskDefaultResponsible, setTaskDefaultResponsible] = useState<string | undefined>(undefined);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<typeof milestones[0] | undefined>(undefined);
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | undefined>(undefined);
  const [phaseManagerOpen, setPhaseManagerOpen] = useState(false);

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

  // Project milestones
  const projectMilestones = useMemo(() => {
    return milestones.filter(m => m.projectId === projectId);
  }, [milestones, projectId]);

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
    <TooltipProvider>
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
{/* Botão Fases removido conforme solicitado */}
            {activeTab !== 'gantt' && activeTab !== 'meetings' && (
              <Button className="gradient-primary text-white" onClick={() => setTaskModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tarefa
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-12 p-1 bg-muted/80 border border-border rounded-xl shadow-sm w-full max-w-2xl">
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
            <TabsTrigger 
              value="meetings" 
              className="flex-1 h-full flex items-center justify-center gap-2 text-sm font-medium rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:text-primary transition-all"
            >
              <FileText className="w-4 h-4" />
              Reuniões
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Stats Cards - 4 cards iguais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ListTodo className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
                </div>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground mt-1">tarefas no projeto</p>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Progresso</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground mt-1">sendo executadas</p>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Concluídas</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% do total
                </p>
              </div>

              <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Progresso</span>
                </div>
                <p className="text-3xl font-bold text-amber-600">{stats.avgProgress}%</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${stats.avgProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Charts Row - 2 colunas iguais */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution - Pie Chart */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4">Distribuição por Status</h3>
                <div className="h-64">
                  {stats.total > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution.filter(s => s.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {statusDistribution.filter(s => s.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ListTodo className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma tarefa cadastrada</p>
                      <Button variant="link" size="sm" className="mt-2 text-xs" onClick={() => setTaskModalOpen(true)}>
                        Criar tarefa
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-4 justify-center">
                  {statusDistribution.filter(s => s.value > 0).map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tasks by Person - Bar Chart */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4">Tarefas por Responsável</h3>
                <div className="h-64">
                  {tasksByPerson.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tasksByPerson} layout="vertical" margin={{ left: 0, right: 20 }}>
                        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          tickLine={false} 
                          axisLine={false} 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          width={70}
                        />
                        <RechartsTooltip
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="tasks" radius={[0, 4, 4, 0]}>
                          {tasksByPerson.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Users className="w-10 h-10 mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma tarefa atribuída</p>
                      <p className="text-xs mt-1">Atribua responsáveis às tarefas</p>
                    </div>
                  )}
                </div>
                {tasksByPerson.length > 0 && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{tasksByPerson.length} responsáveis com tarefas</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row - 3 colunas iguais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fases do Projeto */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Fases do Projeto</h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setPhaseManagerOpen(true)}>
                    <Layers className="w-3 h-3 mr-1" />
                    Gerenciar
                  </Button>
                </div>
                <div className="space-y-3">
                  {projectPhases.length > 0 ? (
                    projectPhases.slice(0, 5).map(phase => {
                      const phaseTasks = projectTasks.filter(t => t.phaseId === phase.id);
                      const completedInPhase = phaseTasks.filter(t => t.status === 'completed').length;
                      const phaseProgress = phaseTasks.length > 0 
                        ? Math.round((completedInPhase / phaseTasks.length) * 100) 
                        : 0;
                      return (
                        <div key={phase.id} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm truncate flex-1 mr-2">{phase.name}</p>
                            <span className="text-xs font-semibold text-primary">{phaseProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${phaseProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">{completedInPhase}/{phaseTasks.length} tarefas</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Layers className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma fase criada</p>
                      <Button variant="link" size="sm" className="mt-2 text-xs" onClick={() => setPhaseModalOpen(true)}>
                        Criar fase
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Alertas */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4">Alertas</h3>
                <div className="space-y-3">
                  {alerts.overdue.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-red-500">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium text-xs">Atrasadas ({alerts.overdue.length})</span>
                      </div>
                      {alerts.overdue.slice(0, 2).map(task => (
                        <div 
                          key={task.id} 
                          className="p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg"
                        >
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{getPhaseName(task.phaseId)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {alerts.dueSoon.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium text-xs">Próximas ({alerts.dueSoon.length})</span>
                      </div>
                      {alerts.dueSoon.slice(0, 2).map(task => (
                        <div 
                          key={task.id} 
                          className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg"
                        >
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{getPhaseName(task.phaseId)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {alerts.unassigned.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span className="font-medium text-xs">Sem Responsável ({alerts.unassigned.length})</span>
                      </div>
                      {alerts.unassigned.slice(0, 2).map(task => (
                        <div 
                          key={task.id} 
                          className="p-2.5 bg-muted/50 border border-border rounded-lg"
                        >
                          <p className="font-medium text-sm truncate">{task.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{getPhaseName(task.phaseId)}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {alerts.overdue.length === 0 && alerts.dueSoon.length === 0 && alerts.unassigned.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-500" />
                      <p className="text-sm font-medium">Tudo em dia!</p>
                      <p className="text-xs">Nenhum alerta no momento</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Marcos do Projeto */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Marcos</h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setEditingMilestone(undefined); setMilestoneModalOpen(true); }}>
                    <Plus className="w-3 h-3 mr-1" />
                    Novo
                  </Button>
                </div>
                <div className="space-y-3">
                  {projectMilestones.length > 0 ? (
                    projectMilestones.slice(0, 5).map(milestone => (
                      <div 
                        key={milestone.id} 
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors",
                          milestone.completed 
                            ? "bg-emerald-500/5 border-emerald-500/20" 
                            : "bg-muted/20 border-border"
                        )}
                        onClick={() => { setEditingMilestone(milestone); setMilestoneModalOpen(true); }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {milestone.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/50 flex-shrink-0" />
                          )}
                          <p className={cn(
                            "font-medium text-sm truncate",
                            milestone.completed && "line-through text-muted-foreground"
                          )}>{milestone.name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6">
                          {new Date(milestone.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                      <Calendar className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Nenhum marco criado</p>
                      <Button variant="link" size="sm" className="mt-2 text-xs" onClick={() => { setEditingMilestone(undefined); setMilestoneModalOpen(true); }}>
                        Criar marco
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-6">
            <ProjectTasksTable projectId={projectId || ''} />
          </TabsContent>

          {/* Gantt Tab */}
          <TabsContent value="gantt" className="mt-6">
            <ProjectGanttChart
              tasks={projectTasks}
              people={people}
              projectId={projectId || ''}
              project={project}
              phases={phases}
              milestones={milestones}
              onAddPhase={() => {
                setEditingPhase(undefined);
                setPhaseModalOpen(true);
              }}
              onEditPhase={(phase) => {
                setEditingPhase(phase);
                setPhaseModalOpen(true);
              }}
              onDeletePhase={async (phaseId) => {
                try {
                  await deletePhase(phaseId);
                } catch (err) {
                  console.error('Error deleting phase:', err);
                }
              }}
              onAddMilestone={() => {
                setEditingMilestone(undefined);
                setMilestoneModalOpen(true);
              }}
              onEditMilestone={(milestone) => {
                setEditingMilestone(milestone);
                setMilestoneModalOpen(true);
              }}
              onDeleteMilestone={async (milestoneId) => {
                try {
                  await deleteMilestone(milestoneId);
                } catch (err) {
                  console.error('Error deleting milestone:', err);
                }
              }}
              onUpdateMilestone={async (milestoneId, data) => {
                try {
                  await updateMilestone(milestoneId, data);
                } catch (err) {
                  console.error('Error updating milestone:', err);
                }
              }}
              onAddTask={(responsibleId) => {
                setTaskDefaultResponsible(responsibleId);
                setTaskModalOpen(true);
              }}
            />
          </TabsContent>

          {/* Meetings Tab */}
          <TabsContent value="meetings" className="mt-6">
            <MeetingNotesTab projectId={projectId || ''} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Modal */}
      <TaskFormModal
        open={taskModalOpen}
        onOpenChange={(open) => {
          setTaskModalOpen(open);
          if (!open) setTaskDefaultResponsible(undefined);
        }}
        defaultProjectId={projectId}
        defaultResponsibleId={taskDefaultResponsible}
      />

      {/* Milestone Modal */}
      <MilestoneFormModal
        open={milestoneModalOpen}
        onOpenChange={(open) => {
          setMilestoneModalOpen(open);
          if (!open) setEditingMilestone(undefined);
        }}
        projectId={projectId || ''}
        milestone={editingMilestone}
      />

      {/* Phase Modal */}
      <PhaseFormModal
        open={phaseModalOpen}
        onOpenChange={(open) => {
          setPhaseModalOpen(open);
          if (!open) setEditingPhase(undefined);
        }}
        projectId={projectId || ''}
        phase={editingPhase}
        nextOrder={projectPhases.length}
      />

      {/* Phase Manager */}
      <PhaseManagerSheet
        open={phaseManagerOpen}
        onOpenChange={setPhaseManagerOpen}
        projectId={projectId || ''}
      />
    </MainLayout>
    </TooltipProvider>
  );
};

export default ProjectDetail;

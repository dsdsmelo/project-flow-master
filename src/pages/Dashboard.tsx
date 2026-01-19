import { useMemo } from 'react';
import { 
  FolderKanban, 
  Clock, 
  TrendingUp, 
  CheckCircle2,
  AlertTriangle,
  Calendar,
  UserX
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, PriorityBadge } from '@/components/ui/status-badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { useData } from '@/contexts/DataContext';
import { calculatePercentage, isTaskOverdue, isTaskDueSoon } from '@/lib/mockData';
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
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { projects, tasks, people, phases, loading, error } = useData();

  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedThisMonth = tasks.filter(t => {
      if (t.status !== 'completed') return false;
      const updated = new Date(t.updatedAt);
      const now = new Date();
      return updated.getMonth() === now.getMonth() && updated.getFullYear() === now.getFullYear();
    }).length;

    return { activeProjects, pendingTasks, inProgressTasks, completedThisMonth };
  }, [projects, tasks]);

  const projectProgress = useMemo(() => {
    return projects
      .filter(p => p.status === 'active')
      .map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const avgProgress = projectTasks.length > 0
          ? projectTasks.reduce((acc, t) => acc + calculatePercentage(t), 0) / projectTasks.length
          : 0;
        return {
          name: project.name.length > 25 ? project.name.slice(0, 25) + '...' : project.name,
          progress: Math.round(avgProgress),
        };
      });
  }, [projects, tasks]);

  const statusDistribution = useMemo(() => {
    const distribution = {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      completed: tasks.filter(t => t.status === 'completed').length,
    };
    return [
      { name: 'Pendente', value: distribution.pending, color: '#EAB308' },
      { name: 'Em Progresso', value: distribution.in_progress, color: '#3B82F6' },
      { name: 'Bloqueado', value: distribution.blocked, color: '#EF4444' },
      { name: 'Concluído', value: distribution.completed, color: '#22C55E' },
    ];
  }, [tasks]);

  const tasksByPerson = useMemo(() => {
    return people.map(person => ({
      name: person.name.split(' ')[0],
      tasks: tasks.filter(t => t.responsibleId === person.id).length,
      color: person.color,
    })).filter(p => p.tasks > 0).sort((a, b) => b.tasks - a.tasks);
  }, [people, tasks]);

  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10);
  }, [tasks]);

  const alerts = useMemo(() => {
    const overdue = tasks.filter(isTaskOverdue);
    const dueSoon = tasks.filter(isTaskDueSoon);
    const unassigned = tasks.filter(t => !t.responsibleId && t.status !== 'completed' && t.status !== 'cancelled');
    return { overdue, dueSoon, unassigned };
  }, [tasks]);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || '-';
  };

  const getPersonName = (personId?: string) => {
    if (!personId) return null;
    return people.find(p => p.id === personId);
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Dashboard" subtitle="Visão geral do seu workspace" />
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
        <Header title="Dashboard" subtitle="Visão geral do seu workspace" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center text-destructive">
            <p className="font-medium mb-2">Erro ao carregar dados</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header title="Dashboard" subtitle="Visão geral do seu workspace" />
      
      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Projetos Ativos"
            value={stats.activeProjects}
            icon={FolderKanban}
            variant="primary"
          />
          <StatCard
            title="Tarefas Pendentes"
            value={stats.pendingTasks}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="Em Progresso"
            value={stats.inProgressTasks}
            icon={TrendingUp}
            variant="primary"
          />
          <StatCard
            title="Concluídas (mês)"
            value={stats.completedThisMonth}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Project Progress */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Progresso dos Projetos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Progresso']} />
                  <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
          </div>

          {/* Alerts */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Alertas</h3>
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
                      to={`/tasks?highlight=${task.id}`}
                      className="block p-3 bg-status-blocked/5 border border-status-blocked/20 rounded-lg hover:bg-status-blocked/10 transition-colors"
                    >
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getProjectName(task.projectId)}</p>
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
                      to={`/tasks?highlight=${task.id}`}
                      className="block p-3 bg-status-pending/5 border border-status-pending/20 rounded-lg hover:bg-status-pending/10 transition-colors"
                    >
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getProjectName(task.projectId)}</p>
                    </Link>
                  ))}
                </div>
              )}

              {alerts.unassigned.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserX className="w-4 h-4" />
                    <span className="font-medium text-sm">Sem Responsável ({alerts.unassigned.length})</span>
                  </div>
                  {alerts.unassigned.slice(0, 3).map(task => (
                    <Link 
                      key={task.id} 
                      to={`/tasks?highlight=${task.id}`}
                      className="block p-3 bg-muted/50 border border-border rounded-lg hover:bg-muted transition-colors"
                    >
                      <p className="font-medium text-sm">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getProjectName(task.projectId)}</p>
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

        {/* Recent Tasks */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tarefas Recentes</h3>
            <Link to="/tasks" className="text-sm text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tarefa</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Projeto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Responsável</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(task => {
                  const person = getPersonName(task.responsibleId);
                  const progress = calculatePercentage(task);
                  return (
                    <tr key={task.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-sm">{task.name}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-muted-foreground">{getProjectName(task.projectId)}</p>
                      </td>
                      <td className="py-3 px-4">
                        {person ? (
                          <div className="flex items-center gap-2">
                            <AvatarCircle name={person.name} color={person.color} size="sm" />
                            <span className="text-sm">{person.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="py-3 px-4 w-32">
                        <ProgressBar value={progress} showLabel size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;

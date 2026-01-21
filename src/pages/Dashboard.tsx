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

  // Recent activity / recent tasks
  const recentTasks = useMemo(() => {
    return tasks
      .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [tasks]);

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


  const alerts = useMemo(() => {
    const overdue = tasks.filter(isTaskOverdue);
    const dueSoon = tasks.filter(isTaskDueSoon);
    const unassigned = tasks.filter(t => !t.responsibleId && t.status !== 'completed' && t.status !== 'cancelled');
    return { overdue, dueSoon, unassigned };
  }, [tasks]);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || '-';
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

        {/* Charts Row - Equal columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Tasks by Person */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Tarefas por Responsável</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasksByPerson}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
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
        </div>

        {/* Alerts & Recent Tasks Row - Equal columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Alertas</h3>
            <div className="space-y-4 max-h-72 overflow-y-auto">
              {alerts.overdue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-status-blocked">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">Tarefas Atrasadas ({alerts.overdue.length})</span>
                  </div>
                  {alerts.overdue.slice(0, 3).map(task => (
                    <Link 
                      key={task.id} 
                      to={`/projects/${task.projectId}`}
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
                      to={`/projects/${task.projectId}`}
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
                      to={`/projects/${task.projectId}`}
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

          {/* Recent Tasks */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Tarefas Recentes</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {recentTasks.length > 0 ? (
                recentTasks.map(task => {
                  const person = people.find(p => p.id === task.responsibleId);
                  return (
                    <Link 
                      key={task.id} 
                      to={`/projects/${task.projectId}`}
                      className="flex items-center gap-3 p-3 bg-muted/30 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ 
                          backgroundColor: task.status === 'pending' ? '#EAB308' : 
                                          task.status === 'in_progress' ? '#3B82F6' : 
                                          task.status === 'blocked' ? '#EF4444' : '#22C55E' 
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.name}</p>
                        <p className="text-xs text-muted-foreground">{getProjectName(task.projectId)}</p>
                      </div>
                      {person && (
                        <div 
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                          style={{ backgroundColor: person.color || '#6b7280' }}
                        >
                          {person.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                    </Link>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p>Nenhuma tarefa recente</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Dashboard;

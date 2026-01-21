import { useMemo } from 'react';
import { 
  FolderKanban, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { useData } from '@/contexts/DataContext';
import { isTaskOverdue, isTaskDueSoon } from '@/lib/mockData';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { projects, tasks, people, loading, error } = useData();

  // KPIs simplificados
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const overdueTasks = tasks.filter(isTaskOverdue).length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const activeProjects = projects.filter(p => p.status === 'active').length;

    return { totalTasks, overdueTasks, inProgressTasks, completedTasks, activeProjects };
  }, [projects, tasks]);

  // Projetos ativos com progresso
  const activeProjectsList = useMemo(() => {
    return projects
      .filter(p => p.status === 'active')
      .map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const completed = projectTasks.filter(t => t.status === 'completed').length;
        const total = projectTasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...project, progress, taskCount: total, completedCount: completed };
      })
      .slice(0, 4);
  }, [projects, tasks]);

  // Alertas (atrasadas e próximas do prazo)
  const alerts = useMemo(() => {
    const overdue = tasks.filter(isTaskOverdue).slice(0, 4);
    const dueSoon = tasks.filter(isTaskDueSoon).slice(0, 4);
    return { overdue, dueSoon };
  }, [tasks]);

  // Atividades recentes (últimas tarefas atualizadas)
  const recentActivity = useMemo(() => {
    return tasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map(task => {
        const project = projects.find(p => p.id === task.projectId);
        const person = people.find(p => p.id === task.responsibleId);
        return { ...task, projectName: project?.name || '-', person };
      });
  }, [tasks, projects, people]);

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || '-';
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Dashboard" subtitle="Visão geral do workspace" />
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
        <Header title="Dashboard" subtitle="Visão geral do workspace" />
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
      <Header title="Dashboard" subtitle="Visão geral do workspace" />
      
      <div className="p-6 space-y-6">
        {/* KPIs - 5 cards iguais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Tarefas</span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{stats.totalTasks}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Progresso</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Concluídas</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.completedTasks}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Atrasadas</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overdueTasks}</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-4 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Projetos Ativos</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.activeProjects}</p>
          </div>
        </div>

        {/* Projetos Ativos + Alertas - 2 colunas iguais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Projetos Ativos */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Projetos Ativos</h3>
              <Link to="/projects">
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todos <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {activeProjectsList.length > 0 ? (
                activeProjectsList.map(project => (
                  <Link 
                    key={project.id} 
                    to={`/projects/${project.id}`}
                    className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.completedCount}/{project.taskCount} tarefas</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{project.progress}%</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="text-sm">Nenhum projeto ativo</p>
                </div>
              )}
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
            <h3 className="text-lg font-semibold mb-4">Alertas</h3>
            <div className="space-y-4 max-h-[280px] overflow-y-auto">
              {alerts.overdue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">Atrasadas ({alerts.overdue.length})</span>
                  </div>
                  {alerts.overdue.map(task => (
                    <Link 
                      key={task.id} 
                      to={`/projects/${task.projectId}`}
                      className="block p-3 bg-red-500/5 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <p className="font-medium text-sm truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getProjectName(task.projectId)}</p>
                    </Link>
                  ))}
                </div>
              )}

              {alerts.dueSoon.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-500">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium text-sm">Próximas do prazo ({alerts.dueSoon.length})</span>
                  </div>
                  {alerts.dueSoon.map(task => (
                    <Link 
                      key={task.id} 
                      to={`/projects/${task.projectId}`}
                      className="block p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg hover:bg-amber-500/10 transition-colors"
                    >
                      <p className="font-medium text-sm truncate">{task.name}</p>
                      <p className="text-xs text-muted-foreground">{getProjectName(task.projectId)}</p>
                    </Link>
                  ))}
                </div>
              )}

              {alerts.overdue.length === 0 && alerts.dueSoon.length === 0 && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm">Tudo em dia! 🎉</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Atividades Recentes - Full width */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentActivity.length > 0 ? (
              recentActivity.map(task => (
                <Link 
                  key={task.id} 
                  to={`/projects/${task.projectId}`}
                  className="flex items-center gap-3 p-3 bg-muted/20 border border-border/50 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      task.status === 'completed' ? "bg-emerald-500" :
                      task.status === 'in_progress' ? "bg-blue-500" :
                      task.status === 'blocked' ? "bg-red-500" : "bg-amber-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{task.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.projectName}</p>
                  </div>
                  {task.person && (
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0"
                      style={{ backgroundColor: task.person.color || '#6b7280' }}
                    >
                      {task.person.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(task.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </Link>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center h-24 text-muted-foreground">
                <p className="text-sm">Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
import { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  LayoutGrid, 
  List,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useData } from '@/contexts/DataContext';
import { calculatePercentage } from '@/lib/mockData';
import { projectStatusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';

const statusColors = {
  planning: 'bg-purple-500',
  active: 'bg-status-completed',
  paused: 'bg-status-pending',
  completed: 'bg-status-progress',
  cancelled: 'bg-status-cancelled',
};

const Projects = () => {
  const { projects, tasks, phases } = useData();
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const getProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    return Math.round(
      projectTasks.reduce((acc, t) => acc + calculatePercentage(t), 0) / projectTasks.length
    );
  };

  const getProjectTaskCount = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId).length;
  };

  const getProjectPhaseCount = (projectId: string) => {
    return phases.filter(p => p.projectId === projectId).length;
  };

  return (
    <MainLayout>
      <Header title="Projetos" subtitle="Gerencie seus projetos e acompanhe o progresso" />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projetos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="planning">Planejamento</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="flex border border-border rounded-lg p-1">
              <Button
                variant={view === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('cards')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setView('table')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        </div>

        {/* Projects Grid/Table */}
        {view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const progress = getProjectProgress(project.id);
              const taskCount = getProjectTaskCount(project.id);
              const phaseCount = getProjectPhaseCount(project.id);

              return (
                <div
                  key={project.id}
                  className="bg-card rounded-xl border border-border p-6 shadow-soft hover:shadow-medium transition-all duration-200 animate-fade-in"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-3 h-3 rounded-full', statusColors[project.status])} />
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {projectStatusLabels[project.status]}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{phaseCount} fases</span>
                      <span>•</span>
                      <span>{taskCount} tarefas</span>
                    </div>

                    {project.startDate && project.endDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(project.startDate).toLocaleDateString('pt-BR')} - {new Date(project.endDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <ProgressBar value={progress} size="md" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Projeto</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Período</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Tarefas</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Progresso</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map(project => {
                  const progress = getProjectProgress(project.id);
                  const taskCount = getProjectTaskCount(project.id);

                  return (
                    <tr key={project.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', statusColors[project.status])} />
                          <span className="text-sm">{projectStatusLabels[project.status]}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-muted-foreground">
                        {project.startDate && project.endDate ? (
                          <>
                            {new Date(project.startDate).toLocaleDateString('pt-BR')} - {new Date(project.endDate).toLocaleDateString('pt-BR')}
                          </>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-4 px-6 text-sm">{taskCount}</td>
                      <td className="py-4 px-6 w-48">
                        <ProgressBar value={progress} showLabel size="sm" />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mb-4">Tente ajustar os filtros ou criar um novo projeto.</p>
            <Button className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Projeto
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Projects;

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
import {
  Search,
  Activity,
  LogIn,
  LogOut,
  UserPlus,
  CreditCard,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Download,
  Calendar,
  UserCheck,
  Shield,
  Clock,
  Eye
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

const actionIcons: Record<string, React.ReactNode> = {
  // Auth
  login: <LogIn className="w-4 h-4" />,
  login_failed: <AlertTriangle className="w-4 h-4" />,
  login_blocked: <AlertTriangle className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
  signup: <UserPlus className="w-4 h-4" />,
  signup_failed: <AlertTriangle className="w-4 h-4" />,
  // 2FA
  '2fa_enabled': <Shield className="w-4 h-4" />,
  '2fa_disabled': <Shield className="w-4 h-4" />,
  '2fa_failed': <AlertTriangle className="w-4 h-4" />,
  '2fa_blocked': <AlertTriangle className="w-4 h-4" />,
  '2fa_success': <CheckCircle className="w-4 h-4" />,
  // Password
  password_reset: <Settings className="w-4 h-4" />,
  password_reset_request: <Settings className="w-4 h-4" />,
  password_changed: <CheckCircle className="w-4 h-4" />,
  // Subscription
  subscription_created: <CreditCard className="w-4 h-4" />,
  subscription_canceled: <CreditCard className="w-4 h-4" />,
  subscription_updated: <CreditCard className="w-4 h-4" />,
  // Profile
  profile_updated: <Settings className="w-4 h-4" />,
  avatar_updated: <UserCheck className="w-4 h-4" />,
  // Admin
  admin_action: <Shield className="w-4 h-4" />,
  admin_login: <Shield className="w-4 h-4" />,
  admin_user_blocked: <AlertTriangle className="w-4 h-4" />,
  admin_user_unblocked: <CheckCircle className="w-4 h-4" />,
  // Default
  default: <Activity className="w-4 h-4" />,
};

const levelConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  info: { icon: <Info className="w-3 h-3" />, variant: 'secondary', color: 'text-blue-500' },
  warning: { icon: <AlertTriangle className="w-3 h-3" />, variant: 'outline', color: 'text-yellow-500' },
  error: { icon: <AlertTriangle className="w-3 h-3" />, variant: 'destructive', color: 'text-red-500' },
  success: { icon: <CheckCircle className="w-3 h-3" />, variant: 'default', color: 'text-green-500' },
};

const actionLabels: Record<string, string> = {
  // Auth
  login: 'Login',
  login_failed: 'Login falhou',
  login_blocked: 'Login bloqueado',
  logout: 'Logout',
  signup: 'Cadastro',
  signup_failed: 'Cadastro falhou',
  email_confirmed: 'Email confirmado',
  // 2FA
  '2fa_enabled': '2FA ativado',
  '2fa_disabled': '2FA desativado',
  '2fa_failed': '2FA falhou',
  '2fa_blocked': '2FA bloqueado',
  '2fa_success': '2FA verificado',
  // Password
  password_reset: 'Senha resetada',
  password_reset_request: 'Solicitação de reset',
  password_changed: 'Senha alterada',
  // Subscription
  subscription_created: 'Assinatura criada',
  subscription_canceled: 'Assinatura cancelada',
  subscription_updated: 'Assinatura atualizada',
  subscription_expired: 'Assinatura expirada',
  payment_failed: 'Pagamento falhou',
  // Profile
  profile_updated: 'Perfil atualizado',
  avatar_updated: 'Avatar atualizado',
  // Admin
  admin_action: 'Ação admin',
  admin_login: 'Login admin',
  admin_user_blocked: 'Usuário bloqueado',
  admin_user_unblocked: 'Usuário desbloqueado',
  admin_role_assigned: 'Role atribuída',
  admin_role_removed: 'Role removida',
  // Data
  data_exported: 'Dados exportados',
  data_imported: 'Dados importados',
  // Projects / Tasks / Phases / Milestones
  project_created: 'Projeto criado',
  project_updated: 'Projeto atualizado',
  project_deleted: 'Projeto excluído',
  task_created: 'Tarefa criada',
  task_updated: 'Tarefa atualizada',
  task_completed: 'Tarefa concluída',
  task_deleted: 'Tarefa excluída',
  phase_created: 'Fase criada',
  phase_deleted: 'Fase excluída',
  milestone_created: 'Marco criado',
  milestone_completed: 'Marco concluído',
  milestone_deleted: 'Marco excluído',
};

const entityTypeLabels: Record<string, string> = {
  subscription: 'Assinatura',
  profile: 'Perfil',
  user: 'Usuário',
  project: 'Projeto',
  task: 'Tarefa',
  phase: 'Fase',
  milestone: 'Marco',
};

type DateFilter = 'all' | 'today' | 'week' | 'month';

const ITEMS_PER_PAGE = 25;
const RETENTION_DAYS = 15;

export const AdminLogsTab = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // Cleanup logs older than 15 days
  const cleanupOldLogs = useCallback(async () => {
    try {
      const cutoffDate = subDays(new Date(), RETENTION_DAYS);
      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error && error.code !== '42P01') {
        console.warn('Cleanup old logs failed:', error.message);
      }
    } catch (err) {
      console.warn('Cleanup error:', err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Run cleanup before fetching
      await cleanupOldLogs();

      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply date filter at query level for better performance
      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case 'today':
            startDate = startOfDay(now);
            break;
          case 'week':
            startDate = startOfDay(subDays(now, 7));
            break;
          case 'month':
            startDate = startOfDay(subDays(now, 30));
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        // Table might not exist yet
        if (error.code === '42P01') {
          setLogs([]);
          return;
        }
        throw error;
      }

      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      // Don't show error toast for missing table - it's expected initially
      if (error.code !== '42P01') {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar logs de atividade.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter, toast, cleanupOldLogs]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchLogs, autoRefresh]);

  // Real-time subscription for new logs
  useEffect(() => {
    const channel = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          setLogs(prev => [payload.new as ActivityLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.user_email?.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.details?.toLowerCase().includes(query) ||
        log.entity_name?.toLowerCase().includes(query) ||
        log.ip_address?.includes(query)
      );
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    if (entityTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityTypeFilter);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [searchQuery, levelFilter, actionFilter, entityTypeFilter, logs]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const uniqueActions = [...new Set(logs.map(l => l.action))].sort();
  const uniqueEntityTypes = [...new Set(logs.filter(l => l.entity_type).map(l => l.entity_type!))].sort();

  // Export logs to CSV
  const exportToCsv = () => {
    const headers = ['Data/Hora', 'Nível', 'Ação', 'Usuário', 'Entidade', 'Detalhes', 'IP'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      log.level,
      actionLabels[log.action] || log.action,
      log.user_email || log.user_id || '-',
      log.entity_name || '-',
      log.details || '-',
      log.ip_address || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();

    toast({
      title: 'Exportação concluída',
      description: `${filteredLogs.length} registros exportados.`,
    });
  };

  // Stats
  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    logins: logs.filter(l => l.action === 'login').length,
    loginFailures: logs.filter(l => l.action === 'login_failed').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Logins</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.logins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Falhas login</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.loginFailures}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avisos</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.warnings}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Erros</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Logs de Atividade</CardTitle>
            <CardDescription>Histórico de ações dos usuários no sistema (atualização em tempo real)</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={autoRefresh ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
                    <Clock className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? 'Desativar auto-refresh (30s)' : 'Ativar auto-refresh (30s)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={exportToCsv} disabled={filteredLogs.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
              <SelectTrigger className="w-[130px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos níveis</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action] || action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {uniqueEntityTypes.length > 0 && (
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas entidades</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {entityTypeLabels[type] || type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
              {filteredLogs.length} de {logs.length}
            </Badge>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Nível</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {logs.length === 0
                        ? 'Nenhum log de atividade ainda. A tabela será populada conforme os usuários interagem com o sistema.'
                        : 'Nenhum log encontrado com os filtros aplicados'
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => {
                    const level = levelConfig[log.level] || levelConfig.info;
                    const actionIcon = actionIcons[log.action] || actionIcons.default;

                    return (
                      <TableRow
                        key={log.id}
                        className={`${selectedLog?.id === log.id ? 'bg-muted/50' : ''} cursor-pointer hover:bg-muted/30`}
                        onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                      >
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant={level.variant} className="gap-1">
                                  {level.icon}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>{log.level}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={level.color}>{actionIcon}</span>
                            <span className="font-medium">
                              {actionLabels[log.action] || log.action}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="truncate max-w-[150px] block">
                                {log.user_email || log.user_id?.slice(0, 8) || '-'}
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <div>Email: {log.user_email || '-'}</div>
                                  <div>ID: {log.user_id || '-'}</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {log.entity_type && (
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">
                                {entityTypeLabels[log.entity_type] || log.entity_type}
                              </span>
                              {log.entity_name && (
                                <span className="text-sm font-medium truncate max-w-[120px]">
                                  {log.entity_name}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="truncate block text-muted-foreground text-left">
                                {log.details || '-'}
                              </TooltipTrigger>
                              {log.details && (
                                <TooltipContent className="max-w-sm">
                                  {log.details}
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {log.ip_address || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalhes</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} de {filteredLogs.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  {"<<"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {"<"}
                </Button>
                <span className="text-sm px-3 text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {">"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  {">>"}
                </Button>
              </div>
            </div>
          )}

          {/* Log Details Panel */}
          {selectedLog && (
            <Card className="mt-4 border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Detalhes do Log
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <p className="font-mono text-xs">{selectedLog.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ação:</span>
                    <p className="font-medium">{actionLabels[selectedLog.action] || selectedLog.action}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nível:</span>
                    <Badge variant={levelConfig[selectedLog.level]?.variant || 'secondary'} className="mt-1">
                      {selectedLog.level}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Usuário:</span>
                    <p>{selectedLog.user_email || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">User ID:</span>
                    <p className="font-mono text-xs">{selectedLog.user_id || '-'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data/Hora:</span>
                    <p>{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                  </div>
                  {selectedLog.entity_type && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Tipo de Entidade:</span>
                        <p>{entityTypeLabels[selectedLog.entity_type] || selectedLog.entity_type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Nome da Entidade:</span>
                        <p>{selectedLog.entity_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ID da Entidade:</span>
                        <p className="font-mono text-xs">{selectedLog.entity_id || '-'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-muted-foreground">IP:</span>
                    <p className="font-mono">{selectedLog.ip_address || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">User Agent:</span>
                    <p className="text-xs truncate">{selectedLog.user_agent || '-'}</p>
                  </div>
                  <div className="col-span-full">
                    <span className="text-muted-foreground">Detalhes:</span>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{selectedLog.details || 'Sem detalhes adicionais'}</p>
                  </div>
                  {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                    <div className="col-span-full">
                      <span className="text-muted-foreground">Metadata:</span>
                      <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

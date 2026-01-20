import { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ActivityLog {
  id: string;
  user_id: string;
  user_email?: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  level: 'info' | 'warning' | 'error' | 'success';
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="w-4 h-4" />,
  login_failed: <AlertTriangle className="w-4 h-4" />,
  login_blocked: <AlertTriangle className="w-4 h-4" />,
  '2fa_failed': <AlertTriangle className="w-4 h-4" />,
  '2fa_blocked': <AlertTriangle className="w-4 h-4" />,
  '2fa_success': <CheckCircle className="w-4 h-4" />,
  logout: <LogOut className="w-4 h-4" />,
  signup: <UserPlus className="w-4 h-4" />,
  subscription_created: <CreditCard className="w-4 h-4" />,
  subscription_canceled: <CreditCard className="w-4 h-4" />,
  settings_updated: <Settings className="w-4 h-4" />,
  default: <Activity className="w-4 h-4" />,
};

const levelConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  info: { icon: <Info className="w-3 h-3" />, variant: 'secondary' },
  warning: { icon: <AlertTriangle className="w-3 h-3" />, variant: 'outline' },
  error: { icon: <AlertTriangle className="w-3 h-3" />, variant: 'destructive' },
  success: { icon: <CheckCircle className="w-3 h-3" />, variant: 'default' },
};

const actionLabels: Record<string, string> = {
  login: 'Login',
  login_failed: 'Login falhou',
  login_blocked: 'Login bloqueado',
  '2fa_failed': '2FA falhou',
  '2fa_blocked': '2FA bloqueado',
  '2fa_success': '2FA verificado',
  logout: 'Logout',
  signup: 'Cadastro',
  subscription_created: 'Assinatura criada',
  subscription_canceled: 'Assinatura cancelada',
  subscription_updated: 'Assinatura atualizada',
  password_reset: 'Reset de senha',
  password_reset_request: 'Solicitação de reset',
  profile_updated: 'Perfil atualizado',
  project_created: 'Projeto criado',
  task_created: 'Tarefa criada',
  admin_action: 'Ação administrativa',
};

export const AdminLogsTab = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

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
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    let filtered = logs;

    if (searchQuery) {
      filtered = filtered.filter(log => 
        log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  }, [searchQuery, levelFilter, actionFilter, logs]);

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Logs de Atividade</CardTitle>
          <CardDescription>Histórico de ações dos usuários no sistema</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nos logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="warning">Aviso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {uniqueActions.map(action => (
                <SelectItem key={action} value={action}>
                  {actionLabels[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="text-muted-foreground">
            {filteredLogs.length} registros
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
                <TableHead>Detalhes</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {logs.length === 0 
                      ? 'Nenhum log de atividade ainda. A tabela será populada conforme os usuários interagem com o sistema.'
                      : 'Nenhum log encontrado com os filtros aplicados'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const level = levelConfig[log.level] || levelConfig.info;
                  const actionIcon = actionIcons[log.action] || actionIcons.default;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant={level.variant} className="gap-1">
                          {level.icon}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {actionIcon}
                          <span className="font-medium">
                            {actionLabels[log.action] || log.action}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {log.user_email || log.user_id?.slice(0, 8) || '-'}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {log.details || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

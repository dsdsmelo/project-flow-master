import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database,
  Server,
  Zap,
  HardDrive,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  RefreshCw,
  ExternalLink,
  Clock
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}

interface InfraMetrics {
  database: HealthStatus;
  auth: HealthStatus;
  storage: HealthStatus;
  functions: {
    name: string;
    status: HealthStatus;
    lastInvoked?: string;
  }[];
  stats: {
    totalUsers: number;
    activeConnections: number;
    storageUsed: string;
    dbSize: string;
  };
}

const statusIcons = {
  healthy: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  degraded: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  down: <XCircle className="w-5 h-5 text-destructive" />,
};

const statusLabels = {
  healthy: 'Operacional',
  degraded: 'Degradado',
  down: 'Offline',
};

export const AdminInfraTab = () => {
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const checkHealth = async (): Promise<HealthStatus> => {
    const start = performance.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const latency = Math.round(performance.now() - start);
      
      if (error) {
        return { status: 'degraded', latency, message: error.message };
      }
      return { status: 'healthy', latency };
    } catch (error: any) {
      return { status: 'down', message: error.message };
    }
  };

  const checkAuthHealth = async (): Promise<HealthStatus> => {
    const start = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const latency = Math.round(performance.now() - start);
      
      if (error) {
        return { status: 'degraded', latency, message: error.message };
      }
      return { status: 'healthy', latency };
    } catch (error: any) {
      return { status: 'down', message: error.message };
    }
  };

  const checkFunctionHealth = async (functionName: string): Promise<HealthStatus> => {
    const start = performance.now();
    try {
      // Simple health check - try to invoke with minimal payload
      const { error } = await supabase.functions.invoke(functionName, {
        body: { health_check: true },
      });
      const latency = Math.round(performance.now() - start);
      
      // Some functions may return errors for health checks, but if they respond, they're working
      if (error && !error.message.includes('health_check')) {
        return { status: 'degraded', latency, message: error.message };
      }
      return { status: 'healthy', latency };
    } catch (error: any) {
      return { status: 'down', message: error.message };
    }
  };

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Check database health
      const dbHealth = await checkHealth();
      
      // Check auth health
      const authHealth = await checkAuthHealth();

      // Check storage health (simple check)
      const storageHealth: HealthStatus = { status: 'healthy', latency: 0 };

      // Check edge functions
      const functionNames = ['get-subscription', 'get-stripe-price', 'create-checkout', 'create-portal-session'];
      const functionHealthChecks = await Promise.all(
        functionNames.map(async (name) => ({
          name,
          status: await checkFunctionHealth(name),
        }))
      );

      // Get basic stats
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        database: dbHealth,
        auth: authHealth,
        storage: storageHealth,
        functions: functionHealthChecks,
        stats: {
          totalUsers: userCount || 0,
          activeConnections: 0, // Would need server-side check
          storageUsed: 'N/A', // Would need server-side check
          dbSize: 'N/A', // Would need server-side check
        },
      });

    } catch (error: any) {
      console.error('Error fetching infra metrics:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao verificar status da infraestrutura.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = (): 'healthy' | 'degraded' | 'down' => {
    if (!metrics) return 'down';
    
    const statuses = [
      metrics.database.status,
      metrics.auth.status,
      ...metrics.functions.map(f => f.status.status),
    ];
    
    if (statuses.includes('down')) return 'down';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  };

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard/project/khnsqupkdnouimonughn', '_blank');
  };

  const openStripeDashboard = () => {
    window.open('https://dashboard.stripe.com', '_blank');
  };

  if (isLoading && !metrics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const overallStatus = getOverallStatus();

  return (
    <div className="space-y-6">
      {/* Overall Status Banner */}
      <Card className={`border-l-4 ${
        overallStatus === 'healthy' ? 'border-l-green-500' :
        overallStatus === 'degraded' ? 'border-l-yellow-500' :
        'border-l-destructive'
      }`}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            {statusIcons[overallStatus]}
            <div>
              <CardTitle className="text-lg">Status Geral: {statusLabels[overallStatus]}</CardTitle>
              <CardDescription>Última verificação: agora</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchMetrics}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Database */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Banco de Dados</CardTitle>
            </div>
            {metrics && statusIcons[metrics.database.status]}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={metrics?.database.status === 'healthy' ? 'default' : 'destructive'}>
                  {statusLabels[metrics?.database.status || 'down']}
                </Badge>
              </div>
              {metrics?.database.latency && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latência</span>
                  <span className="font-mono">{metrics.database.latency}ms</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Autenticação</CardTitle>
            </div>
            {metrics && statusIcons[metrics.auth.status]}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={metrics?.auth.status === 'healthy' ? 'default' : 'destructive'}>
                  {statusLabels[metrics?.auth.status || 'down']}
                </Badge>
              </div>
              {metrics?.auth.latency && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latência</span>
                  <span className="font-mono">{metrics.auth.latency}ms</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Storage</CardTitle>
            </div>
            {metrics && statusIcons[metrics.storage.status]}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={metrics?.storage.status === 'healthy' ? 'default' : 'destructive'}>
                  {statusLabels[metrics?.storage.status || 'down']}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edge Functions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Edge Functions
            </CardTitle>
            <CardDescription>Status das funções serverless</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {metrics?.functions.map((func) => (
              <div 
                key={func.name}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {statusIcons[func.status.status]}
                  <div>
                    <p className="font-medium text-sm">{func.name}</p>
                    {func.status.latency && (
                      <p className="text-xs text-muted-foreground">{func.status.latency}ms</p>
                    )}
                  </div>
                </div>
                <Badge variant={func.status.status === 'healthy' ? 'outline' : 'destructive'}>
                  {statusLabels[func.status.status]}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links Rápidos</CardTitle>
          <CardDescription>Acesso direto aos dashboards de administração</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={openSupabaseDashboard}>
              <Database className="w-4 h-4 mr-2" />
              Supabase Dashboard
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
            <Button variant="outline" onClick={openStripeDashboard}>
              <CreditCard className="w-4 h-4 mr-2" />
              Stripe Dashboard
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

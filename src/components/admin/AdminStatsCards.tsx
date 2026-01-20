import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  DollarSign,
  UserPlus,
  AlertTriangle
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  canceledUsers: number;
  revenue: number;
  newUsersThisMonth: number;
  churnRate: number;
}

interface AdminStatsCardsProps {
  stats: AdminStats;
}

export const AdminStatsCards = ({ stats }: AdminStatsCardsProps) => {
  const StatCard = ({ 
    title, 
    value, 
    icon, 
    description,
    trend 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ReactNode; 
    description?: string;
    trend?: { value: number; positive: boolean };
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {trend && (
          <p className={`text-xs ${trend.positive ? 'text-green-600' : 'text-destructive'}`}>
            {trend.positive ? '+' : ''}{trend.value}% vs mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Usuários"
        value={stats.totalUsers}
        icon={<Users className="h-4 w-4 text-muted-foreground" />}
        description="Cadastros no sistema"
      />
      <StatCard
        title="Assinaturas Ativas"
        value={stats.activeSubscriptions}
        icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
        description={`${Math.round((stats.activeSubscriptions / stats.totalUsers) * 100) || 0}% de conversão`}
      />
      <StatCard
        title="MRR (Receita Mensal)"
        value={`R$ ${stats.revenue.toLocaleString('pt-BR')}`}
        icon={<DollarSign className="h-4 w-4 text-primary" />}
        description="Receita recorrente mensal"
      />
      <StatCard
        title="Novos este mês"
        value={stats.newUsersThisMonth}
        icon={<UserPlus className="h-4 w-4 text-blue-500" />}
      />
      <StatCard
        title="Em Trial"
        value={stats.trialUsers}
        icon={<Clock className="h-4 w-4 text-yellow-500" />}
        description="Aguardando conversão"
      />
      <StatCard
        title="Cancelados"
        value={stats.canceledUsers}
        icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
        description="Total de cancelamentos"
      />
      <StatCard
        title="Taxa de Churn"
        value={`${stats.churnRate.toFixed(1)}%`}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        description="Cancelamentos / ativos"
      />
      <StatCard
        title="ARR (Receita Anual)"
        value={`R$ ${(stats.revenue * 12).toLocaleString('pt-BR')}`}
        icon={<DollarSign className="h-4 w-4 text-green-500" />}
        description="Projeção anual"
      />
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Activity,
  Server,
  RefreshCw,
  Shield,
  LogOut,
  Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminUsersTab, UserWithSubscription } from '@/components/admin/AdminUsersTab';
import { AdminLogsTab } from '@/components/admin/AdminLogsTab';
import { AdminInfraTab } from '@/components/admin/AdminInfraTab';
import { TwoFactorSetup } from '@/components/admin/TwoFactorSetup';

const AdminPanel = () => {
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [adminEmail, setAdminEmail] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    trialUsers: 0,
    canceledUsers: 0,
    revenue: 0,
    newUsersThisMonth: 0,
    churnRate: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check admin session and get email
  useEffect(() => {
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    if (!adminAuth) {
      navigate('/admin/login');
      return;
    }
    
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setAdminEmail(data.user.email);
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    sessionStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminUserId');
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Você saiu do painel administrativo.',
    });
    navigate('/admin/login');
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch subscriptions
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*');

      if (subsError) throw subsError;

      // Fetch admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = new Set(roles?.map(r => r.user_id) || []);

      const usersWithSubs: UserWithSubscription[] = (profiles || []).map(profile => {
        const sub = subscriptions?.find(s => s.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          created_at: profile.created_at,
          last_sign_in_at: profile.last_sign_in_at,
          subscription: sub ? {
            status: sub.status,
            current_period_end: sub.current_period_end,
            stripe_customer_id: sub.stripe_customer_id,
          } : null,
          is_admin: adminUserIds.has(profile.id),
          is_blocked: profile.is_blocked,
        };
      });

      setUsers(usersWithSubs);

      // Calculate stats
      const activeCount = usersWithSubs.filter(u => u.subscription?.status === 'active').length;
      const trialCount = usersWithSubs.filter(u => u.subscription?.status === 'trialing').length;
      const canceledCount = usersWithSubs.filter(u => u.subscription?.status === 'canceled').length;
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const newThisMonth = usersWithSubs.filter(u => new Date(u.created_at) >= startOfMonth).length;

      const churnRate = activeCount + canceledCount > 0 
        ? (canceledCount / (activeCount + canceledCount)) * 100 
        : 0;

      setStats({
        totalUsers: usersWithSubs.length,
        activeSubscriptions: activeCount,
        trialUsers: trialCount,
        canceledUsers: canceledCount,
        revenue: activeCount * 69,
        newUsersThisMonth: newThisMonth,
        churnRate,
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do admin.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const adminAuth = sessionStorage.getItem('adminAuthenticated');
    if (adminAuth) {
      fetchUsers();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Painel Admin</h1>
              <p className="text-xs text-muted-foreground">Tarefaa SaaS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchUsers} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Visão Geral</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="infra" className="gap-2">
              <Server className="w-4 h-4" />
              <span className="hidden sm:inline">Infraestrutura</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminStatsCards stats={stats} />
            <AdminUsersTab users={users} isLoading={isLoading} onRefresh={fetchUsers} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersTab users={users} isLoading={isLoading} onRefresh={fetchUsers} />
          </TabsContent>

          <TabsContent value="logs">
            <AdminLogsTab />
          </TabsContent>

          <TabsContent value="infra">
            <AdminInfraTab />
          </TabsContent>

          <TabsContent value="security">
            <div className="space-y-6">
              <TwoFactorSetup 
                userId={sessionStorage.getItem('adminUserId') || ''} 
                userEmail={adminEmail}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;

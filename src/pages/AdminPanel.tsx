import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
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

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <AdminStatsCards stats={stats} />
            <AdminUsersTab users={users} isLoading={isLoading} onRefresh={fetchUsers} />
          </div>
        );
      case 'users':
        return <AdminUsersTab users={users} isLoading={isLoading} onRefresh={fetchUsers} />;
      case 'logs':
        return <AdminLogsTab />;
      case 'infra':
        return <AdminInfraTab />;
      case 'security':
        return (
          <div className="space-y-6">
            <TwoFactorSetup 
              userId={sessionStorage.getItem('adminUserId') || ''} 
              userEmail={adminEmail}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRefresh={fetchUsers}
          onLogout={handleLogout}
          isLoading={isLoading}
        />
        
        <main className="flex-1 flex flex-col min-w-0">
          {/* Header with trigger */}
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-4 px-4 py-3">
              <SidebarTrigger />
              <div>
                <h2 className="font-semibold">
                  {activeTab === 'overview' && 'Visão Geral'}
                  {activeTab === 'users' && 'Clientes'}
                  {activeTab === 'logs' && 'Logs de Auditoria'}
                  {activeTab === 'infra' && 'Infraestrutura'}
                  {activeTab === 'security' && 'Segurança'}
                </h2>
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 p-6 overflow-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminPanel;

import { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Download,
  Upload,
  Database,
  Lock,
  Save,
  FileSpreadsheet,
  Loader2,
  User,
  Mail,
  Palette
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Settings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { projects, tasks, people, cells, phases, customColumns } = useData();
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    toast({
      title: 'Tema alterado',
      description: `Modo ${!isDarkMode ? 'escuro' : 'claro'} ativado.`,
    });
  };

  const handleExportExcel = () => {
    const activeCustomColumns = customColumns.filter(c => c.active);
    const baseHeaders = ['Nome', 'Projeto', 'Fase', 'Responsável', 'Status', 'Prioridade', 'Progresso'];
    const customHeaders = activeCustomColumns.map(c => c.name);
    const headers = [...baseHeaders, ...customHeaders];
    
    const rows = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const phase = phases.find(p => p.id === task.phaseId);
      const person = people.find(p => p.id === task.responsibleId);
      const progress = task.quantity ? Math.round((task.collected || 0) / task.quantity * 100) : 0;
      
      const baseValues = [
        `"${task.name}"`,
        `"${project?.name || ''}"`,
        `"${phase?.name || ''}"`,
        `"${person?.name || ''}"`,
        task.status,
        task.priority,
        `${progress}%`
      ];
      
      const customValues = activeCustomColumns.map(col => {
        const value = task.customValues?.[col.id];
        if (value === undefined || value === '') return '';
        if (col.type === 'user') {
          const user = people.find(p => p.id === value);
          return `"${user?.name || ''}"`;
        }
        if (col.type === 'date') {
          return new Date(value as string).toLocaleDateString('pt-BR');
        }
        return typeof value === 'string' ? `"${value}"` : value;
      });
      
      return [...baseValues, ...customValues].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarefas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: 'Exportação concluída',
      description: 'Os dados foram exportados com sucesso.',
    });
  };

  const handleBackup = () => {
    const data = {
      projects,
      tasks,
      people,
      cells,
      phases,
      customColumns,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    toast({
      title: 'Backup realizado',
      description: 'O backup foi baixado com sucesso.',
    });
  };

  const handleRestore = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            toast({
              title: 'Restauração concluída',
              description: 'Os dados foram restaurados com sucesso.',
            });
          } catch (error) {
            toast({
              title: 'Erro na restauração',
              description: 'O arquivo de backup é inválido.',
              variant: 'destructive',
            });
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Senha alterada',
        description: 'Sua senha foi alterada com sucesso.',
      });
      
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({
        title: 'Erro ao alterar senha',
        description: error.message || 'Não foi possível alterar a senha.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <MainLayout>
      <Header title="Configurações" subtitle="Gerencie sua conta e preferências" />
      
      <div className="p-6">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Aparência
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Database className="w-4 h-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informações da Conta
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{user?.email?.split('@')[0] || 'Usuário'}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Membro desde: {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4">Estatísticas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">{projects.length}</p>
                    <p className="text-sm text-muted-foreground">Projetos</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-500">{tasks.length}</p>
                    <p className="text-sm text-muted-foreground">Tarefas</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-emerald-500">{tasks.filter(t => t.status === 'completed').length}</p>
                    <p className="text-sm text-muted-foreground">Concluídas</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-500">{people.length}</p>
                    <p className="text-sm text-muted-foreground">Pessoas</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  Tema
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Modo Escuro</p>
                    <p className="text-sm text-muted-foreground">Alterne entre o tema claro e escuro</p>
                  </div>
                  <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Data Tab */}
          <TabsContent value="data" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Exportação
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Exportar para Excel</p>
                    <p className="text-sm text-muted-foreground">Baixe todas as tarefas em formato CSV</p>
                  </div>
                  <Button onClick={handleExportExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Backup
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Fazer Backup</p>
                      <p className="text-sm text-muted-foreground">Baixe todos os dados</p>
                    </div>
                    <Button variant="outline" onClick={handleBackup}>
                      <Download className="w-4 h-4 mr-2" />
                      Backup
                    </Button>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="font-medium">Restaurar Backup</p>
                      <p className="text-sm text-muted-foreground">Restaure de um arquivo</p>
                    </div>
                    <Button variant="outline" onClick={handleRestore}>
                      <Upload className="w-4 h-4 mr-2" />
                      Restaurar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Alterar Senha
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isChangingPassword}>
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Nova Senha
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
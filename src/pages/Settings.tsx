import { useState, useRef } from 'react';
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
  Palette,
  Camera
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
  const { user, profile, updateProfile, refreshProfile } = useAuth();
  const { projects, tasks, people, cells, phases, customColumns } = useData();
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync fullName with profile when it changes
  useState(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    toast({
      title: 'Tema alterado',
      description: `Modo ${!isDarkMode ? 'escuro' : 'claro'} ativado.`,
    });
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const { error } = await updateProfile({ full_name: fullName });
      if (error) throw error;
      
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar o perfil.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: profileError } = await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });
      if (profileError) throw profileError;

      toast({
        title: 'Foto atualizada',
        description: 'Sua foto de perfil foi alterada com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar foto',
        description: error.message || 'Não foi possível enviar a foto.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
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

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuário';

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
              {/* Profile Info & Avatar */}
              <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Foto e Nome
                </h3>
                <div className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex items-center gap-4">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                        {profile?.avatar_url ? (
                          <img 
                            src={profile.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-10 h-10 text-primary-foreground" />
                        )}
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{displayName}</p>
                      <p className="text-sm text-muted-foreground">Clique na foto para alterar</p>
                    </div>
                  </div>

                  {/* Name Edit */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>

                  {/* Email (readonly) */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{user?.email}</span>
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={isSavingProfile} className="w-full">
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats */}
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
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Membro desde: {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                  </p>
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
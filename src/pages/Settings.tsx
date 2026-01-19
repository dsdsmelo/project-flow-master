import { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Download,
  Upload,
  Database,
  Lock,
  Save,
  FileSpreadsheet
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/contexts/DataContext';

const Settings = () => {
  const { toast } = useToast();
  const { projects, tasks, people, cells, devices, phases } = useData();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    toast({
      title: 'Tema alterado',
      description: `Modo ${!isDarkMode ? 'escuro' : 'claro'} ativado.`,
    });
  };

  const handleExportExcel = () => {
    // Create CSV content
    const headers = ['Nome', 'Projeto', 'Fase', 'Responsável', 'Status', 'Prioridade', 'Progresso'];
    const rows = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const phase = phases.find(p => p.id === task.phaseId);
      const person = people.find(p => p.id === task.responsibleId);
      const progress = task.quantity ? Math.round((task.collected || 0) / task.quantity * 100) : 0;
      return [
        task.name,
        project?.name || '',
        phase?.name || '',
        person?.name || '',
        task.status,
        task.priority,
        `${progress}%`
      ].join(',');
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
      devices,
      phases,
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
            // In a real app, you would update the context with the restored data
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

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não coincidem.',
        variant: 'destructive',
      });
      return;
    }

    if (currentPassword !== 'admin123') {
      toast({
        title: 'Erro',
        description: 'Senha atual incorreta.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Senha alterada',
      description: 'Sua senha foi alterada com sucesso.',
    });
    
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <MainLayout>
      <Header title="Configurações" subtitle="Personalize o sistema conforme suas preferências" />
      
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Theme */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Aparência
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Modo Escuro</p>
              <p className="text-sm text-muted-foreground">Alterne entre o tema claro e escuro</p>
            </div>
            <Switch checked={isDarkMode} onCheckedChange={toggleTheme} />
          </div>
        </div>

        {/* Export */}
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

        {/* Backup */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Fazer Backup</p>
                <p className="text-sm text-muted-foreground">Baixe todos os dados do sistema</p>
              </div>
              <Button variant="outline" onClick={handleBackup}>
                <Download className="w-4 h-4 mr-2" />
                Backup
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Restaurar Backup</p>
                <p className="text-sm text-muted-foreground">Restaure dados de um backup anterior</p>
              </div>
              <Button variant="outline" onClick={handleRestore}>
                <Upload className="w-4 h-4 mr-2" />
                Restaurar
              </Button>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Alterar Senha
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
            <Button type="submit" className="gradient-primary text-white">
              <Save className="w-4 h-4 mr-2" />
              Salvar Nova Senha
            </Button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;

import { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit,
  Power,
  Building2
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

const Cells = () => {
  const { cells, setCells, tasks } = useData();
  const [search, setSearch] = useState('');

  const filteredCells = useMemo(() => {
    return cells.filter(cell => 
      cell.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [cells, search]);

  const getTaskCount = (cellId: string) => {
    return tasks.filter(t => t.cellId === cellId).length;
  };

  const toggleActive = (cellId: string) => {
    setCells(prev => prev.map(c => 
      c.id === cellId ? { ...c, active: !c.active } : c
    ));
  };

  return (
    <MainLayout>
      <Header title="Células" subtitle="Gerencie as áreas e departamentos" />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar células..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Célula
          </Button>
        </div>

        {/* Cells List */}
        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Célula</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Descrição</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Tarefas</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCells.map(cell => {
                const taskCount = getTaskCount(cell.id);

                return (
                  <tr 
                    key={cell.id} 
                    className={cn(
                      "border-t border-border hover:bg-muted/30 transition-colors",
                      !cell.active && "opacity-60"
                    )}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium">{cell.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-muted-foreground">
                      {cell.description || '-'}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      {taskCount} tarefas
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        cell.active 
                          ? "bg-status-completed/10 text-status-completed" 
                          : "bg-status-cancelled/10 text-status-cancelled"
                      )}>
                        {cell.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => toggleActive(cell.id)}
                        >
                          <Power className={cn("w-4 h-4", cell.active ? "text-status-completed" : "text-muted-foreground")} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredCells.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma célula encontrada</h3>
              <p className="text-muted-foreground mb-4">Adicione uma nova célula para começar.</p>
              <Button className="gradient-primary text-white">
                <Plus className="w-4 h-4 mr-2" />
                Nova Célula
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Cells;

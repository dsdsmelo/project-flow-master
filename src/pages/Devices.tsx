import { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Edit,
  Power,
  Monitor
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
import { cn } from '@/lib/utils';

const Devices = () => {
  const { devices, setDevices, tasks } = useData();
  const [search, setSearch] = useState('');

  const filteredDevices = useMemo(() => {
    return devices.filter(device => 
      device.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [devices, search]);

  const getTaskCount = (deviceId: string) => {
    return tasks.filter(t => t.deviceId === deviceId).length;
  };

  const toggleActive = (deviceId: string) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, active: !d.active } : d
    ));
  };

  return (
    <MainLayout>
      <Header title="Devices" subtitle="Gerencie os tipos de dispositivos e equipamentos" />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar devices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button className="gradient-primary text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Device
          </Button>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDevices.map(device => {
            const taskCount = getTaskCount(device.id);

            return (
              <div
                key={device.id}
                className={cn(
                  "bg-card rounded-xl border border-border p-6 shadow-soft hover:shadow-medium transition-all duration-200 animate-fade-in",
                  !device.active && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Monitor className="w-6 h-6 text-primary" />
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                    device.active 
                      ? "bg-status-completed/10 text-status-completed" 
                      : "bg-status-cancelled/10 text-status-cancelled"
                  )}>
                    {device.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2">{device.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {taskCount} tarefas vinculadas
                </p>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => toggleActive(device.id)}
                  >
                    <Power className={cn("w-4 h-4", device.active ? "text-status-completed" : "text-muted-foreground")} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredDevices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Monitor className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum device encontrado</h3>
            <p className="text-muted-foreground mb-4">Adicione um novo device para começar.</p>
            <Button className="gradient-primary text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Device
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Devices;

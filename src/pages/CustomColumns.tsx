import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { MainLayout } from '@/components/layout/MainLayout';
import { CustomColumnManager } from '@/components/custom-columns/CustomColumnManager';
import { useData } from '@/contexts/DataContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Columns3 } from 'lucide-react';

const CustomColumns = () => {
  const { projects } = useData();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  return (
    <MainLayout>
      <Header 
        title="Colunas Customizadas" 
        subtitle="Gerencie campos extras para as tarefas de cada projeto" 
      />
      
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns3 className="w-5 h-5" />
              Selecione um Projeto
            </CardTitle>
            <CardDescription>
              Cada projeto pode ter suas próprias colunas customizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Selecione um projeto..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProjectId && (
          <Card>
            <CardContent className="pt-6">
              <CustomColumnManager projectId={selectedProjectId} />
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default CustomColumns;

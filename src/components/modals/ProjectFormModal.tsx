import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { Project, TASK_CONFIGURABLE_FIELDS } from '@/lib/types';
import { toast } from 'sonner';
import { Settings2, Info } from 'lucide-react';

const projectSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}

export function ProjectFormModal({ open, onOpenChange, project }: ProjectFormModalProps) {
  const { addProject, updateProject } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibleFields, setVisibleFields] = useState<string[]>([]);

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'planning',
    },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        name: project.name,
        description: project.description || '',
        startDate: project.startDate || '',
        endDate: project.endDate || '',
        status: project.status,
      });
      // Use saved visible fields or defaults
      setVisibleFields(
        project.visibleFields || 
        TASK_CONFIGURABLE_FIELDS.filter(f => f.default).map(f => f.key)
      );
    } else {
      form.reset({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'planning',
      });
      // Set defaults for new project
      setVisibleFields(TASK_CONFIGURABLE_FIELDS.filter(f => f.default).map(f => f.key));
    }
  }, [project, form, open]);

  const toggleField = (fieldKey: string) => {
    setVisibleFields(prev => 
      prev.includes(fieldKey) 
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const onSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      const projectData = {
        name: data.name,
        description: data.description || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        status: data.status,
        visibleFields,
      };

      if (project) {
        await updateProject(project.id, projectData);
        toast.success('Projeto atualizado com sucesso!');
      } else {
        await addProject(projectData);
        toast.success('Projeto criado com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error('Erro ao salvar projeto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{project ? 'Editar Projeto' : 'Novo Projeto'}</DialogTitle>
          <DialogDescription>
            {project ? 'Atualize as informações do projeto' : 'Preencha os dados para criar um novo projeto'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="fields" className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Campos Visíveis
            </TabsTrigger>
          </TabsList>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4">
            <TabsContent value="info" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Nome do projeto"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Descrição do projeto"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(value: ProjectFormData['status']) => form.setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planejamento</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...form.register('startDate')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...form.register('endDate')}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fields" className="space-y-4">
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione quais campos aparecerão no formulário de tarefas deste projeto. 
                  Campos não selecionados ficarão ocultos ao criar ou editar tarefas.
                </p>
                
                <div className="grid grid-cols-2 gap-3">
                  {TASK_CONFIGURABLE_FIELDS.map((field) => (
                    <div key={field.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-${field.key}`}
                        checked={visibleFields.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                      />
                      <Label 
                        htmlFor={`field-${field.key}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <strong>Nota:</strong> Os campos "Nome", "Projeto" e "Status" são sempre obrigatórios e não podem ser desativados.
              </div>
            </TabsContent>

            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gradient-primary text-white">
                {isSubmitting ? 'Salvando...' : project ? 'Atualizar' : 'Criar Projeto'}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

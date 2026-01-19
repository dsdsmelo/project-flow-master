import { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { Task, TASK_CONFIGURABLE_FIELDS } from '@/lib/types';
import { toast } from 'sonner';

const taskSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  phaseId: z.string().optional(),
  responsibleId: z.string().optional(),
  quantity: z.number().optional(),
  collected: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'blocked', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  observation: z.string().optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultProjectId?: string;
}

export function TaskFormModal({ open, onOpenChange, task, defaultProjectId }: TaskFormModalProps) {
  const { projects, phases, people, addTask, updateTask } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      projectId: defaultProjectId || '',
      phaseId: '',
      responsibleId: '',
      quantity: undefined,
      collected: undefined,
      startDate: '',
      endDate: '',
      status: 'pending',
      priority: 'medium',
      observation: '',
    },
  });

  const selectedProjectId = form.watch('projectId');
  const projectPhases = phases.filter(p => p.projectId === selectedProjectId);

  // Get visible fields for the selected project
  const visibleFields = useMemo(() => {
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (selectedProject?.visibleFields) {
      return selectedProject.visibleFields;
    }
    // Return defaults if no project selected or no fields configured
    return TASK_CONFIGURABLE_FIELDS.filter(f => f.default).map(f => f.key);
  }, [selectedProjectId, projects]);

  const isFieldVisible = (fieldKey: string) => visibleFields.includes(fieldKey);

  useEffect(() => {
    if (task) {
      form.reset({
        name: task.name,
        description: task.description || '',
        projectId: task.projectId,
        phaseId: task.phaseId || '',
        responsibleId: task.responsibleId || '',
        quantity: task.quantity,
        collected: task.collected,
        startDate: task.startDate || '',
        endDate: task.endDate || '',
        status: task.status,
        priority: task.priority,
        observation: task.observation || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        projectId: defaultProjectId || '',
        phaseId: '',
        responsibleId: '',
        quantity: undefined,
        collected: undefined,
        startDate: '',
        endDate: '',
        status: 'pending',
        priority: 'medium',
        observation: '',
      });
    }
  }, [task, defaultProjectId, form, open]);

  const onSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const taskData = {
        name: data.name,
        description: data.description || undefined,
        projectId: data.projectId,
        phaseId: data.phaseId || undefined,
        responsibleId: data.responsibleId || undefined,
        quantity: data.quantity,
        collected: data.collected,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        status: data.status,
        priority: data.priority,
        observation: data.observation || undefined,
        customValues: task?.customValues || {},
      };

      if (task) {
        await updateTask(task.id, taskData);
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        await addTask(taskData);
        toast.success('Tarefa criada com sucesso!');
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Erro ao salvar tarefa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Atualize as informações da tarefa' : 'Preencha os dados para criar uma nova tarefa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name - Always visible */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Nome da tarefa"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Description - Configurable */}
            {isFieldVisible('description') && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Descrição detalhada da tarefa"
                  rows={3}
                />
              </div>
            )}

            {/* Project - Always visible */}
            <div className="space-y-2">
              <Label htmlFor="projectId">Projeto *</Label>
              <Select
                value={form.watch('projectId')}
                onValueChange={(value) => {
                  form.setValue('projectId', value);
                  form.setValue('phaseId', '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.projectId && (
                <p className="text-sm text-destructive">{form.formState.errors.projectId.message}</p>
              )}
            </div>

            {/* Phase - Configurable */}
            {isFieldVisible('phase') && (
              <div className="space-y-2">
                <Label htmlFor="phaseId">Fase</Label>
                <Select
                  value={form.watch('phaseId') || ''}
                  onValueChange={(value) => form.setValue('phaseId', value === 'none' ? '' : value)}
                  disabled={!selectedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma fase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {projectPhases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Responsible - Configurable */}
            {isFieldVisible('responsible') && (
              <div className="space-y-2">
                <Label htmlFor="responsibleId">Responsável</Label>
                <Select
                  value={form.watch('responsibleId') || ''}
                  onValueChange={(value) => form.setValue('responsibleId', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {people.filter(p => p.active).map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status - Always visible */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value: TaskFormData['status']) => form.setValue('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Progresso</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority - Configurable */}
            {isFieldVisible('priority') && (
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={form.watch('priority')}
                  onValueChange={(value: TaskFormData['priority']) => form.setValue('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity - Configurable */}
            {isFieldVisible('quantity') && (
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  {...form.register('quantity', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            )}

            {/* Collected - Configurable */}
            {isFieldVisible('collected') && (
              <div className="space-y-2">
                <Label htmlFor="collected">Coletados</Label>
                <Input
                  id="collected"
                  type="number"
                  {...form.register('collected', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>
            )}

            {/* Start Date - Configurable */}
            {isFieldVisible('startDate') && (
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Início</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...form.register('startDate')}
                />
              </div>
            )}

            {/* End Date - Configurable */}
            {isFieldVisible('endDate') && (
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Fim</Label>
                <Input
                  id="endDate"
                  type="date"
                  {...form.register('endDate')}
                />
              </div>
            )}

            {/* Observation - Configurable */}
            {isFieldVisible('observation') && (
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="observation">Observação</Label>
                <Textarea
                  id="observation"
                  {...form.register('observation')}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gradient-primary text-white">
              {isSubmitting ? 'Salvando...' : task ? 'Atualizar' : 'Criar Tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

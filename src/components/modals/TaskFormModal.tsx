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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useData } from '@/contexts/DataContext';
import { Task } from '@/lib/types';
import { toast } from 'sonner';

const taskSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  projectId: z.string().min(1, 'Projeto é obrigatório'),
  responsibleId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task;
  defaultProjectId?: string;
}

export function TaskFormModal({ open, onOpenChange, task, defaultProjectId }: TaskFormModalProps) {
  const { projects, people, addTask, updateTask } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      projectId: defaultProjectId || '',
      responsibleId: '',
      startDate: '',
      endDate: '',
      priority: 'medium',
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        name: task.name,
        description: task.description || '',
        projectId: task.projectId,
        responsibleId: task.responsibleId || '',
        startDate: task.startDate || '',
        endDate: task.endDate || '',
        priority: task.priority,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        projectId: defaultProjectId || '',
        responsibleId: '',
        startDate: '',
        endDate: '',
        priority: 'medium',
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
        responsibleId: data.responsibleId || undefined,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        status: task?.status || 'pending' as const, // Keep existing status or default to pending
        priority: data.priority,
        observation: task?.observation, // Keep existing observation
        customValues: task?.customValues || {}, // Keep existing custom values
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          <DialogDescription>
            {task ? 'Atualize as informações da tarefa' : 'Preencha os dados básicos para criar uma nova tarefa'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...form.register('name')}
              placeholder="Nome da tarefa"
              maxLength={200}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Descrição detalhada da tarefa"
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Project - Fixed when defaultProjectId is provided */}
          {!defaultProjectId && (
            <div className="space-y-2">
              <Label htmlFor="projectId">Projeto *</Label>
              <Select
                value={form.watch('projectId')}
                onValueChange={(value) => form.setValue('projectId', value)}
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
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Responsible */}
            <div className="space-y-2">
              <Label htmlFor="responsibleId">Responsável</Label>
              <Select
                value={form.watch('responsibleId') || ''}
                onValueChange={(value) => form.setValue('responsibleId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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

            {/* Priority */}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                {...form.register('startDate')}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register('endDate')}
              />
            </div>
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

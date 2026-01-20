import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useData } from '@/contexts/DataContext';
import { Milestone } from '@/lib/types';
import { toast } from 'sonner';
import { Calendar, Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phaseId: z.string().min(1, 'Fase é obrigatória'),
  description: z.string().optional(),
  color: z.string().optional(),
  usePhaseEndDate: z.boolean(),
  date: z.string().optional(),
}).refine((data) => {
  // Se não usar data da fase, precisa ter data manual
  if (!data.usePhaseEndDate && !data.date) {
    return false;
  }
  return true;
}, {
  message: "Selecione uma data ou ative 'Usar data final da fase'",
  path: ["date"],
});

type MilestoneFormData = z.infer<typeof milestoneSchema>;

interface MilestoneFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: Milestone;
}

const colorOptions = [
  { value: '#EAB308', label: 'Amarelo' },
  { value: '#22C55E', label: 'Verde' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#F97316', label: 'Laranja' },
];

export const MilestoneFormModal = ({
  open,
  onOpenChange,
  projectId,
  milestone,
}: MilestoneFormModalProps) => {
  const { phases, addMilestone, updateMilestone } = useData();
  const projectPhases = phases.filter(p => p.projectId === projectId);

  const form = useForm<MilestoneFormData>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: '',
      phaseId: '',
      description: '',
      color: '#EAB308',
      usePhaseEndDate: true,
      date: undefined,
    },
  });

  const usePhaseEndDate = form.watch('usePhaseEndDate');

  useEffect(() => {
    if (milestone) {
      form.reset({
        name: milestone.name,
        phaseId: milestone.phaseId,
        description: milestone.description || '',
        color: milestone.color || '#EAB308',
        usePhaseEndDate: milestone.usePhaseEndDate ?? true,
        date: milestone.date || undefined,
      });
    } else {
      form.reset({
        name: '',
        phaseId: projectPhases[0]?.id || '',
        description: '',
        color: '#EAB308',
        usePhaseEndDate: true,
        date: undefined,
      });
    }
  }, [milestone, open, projectPhases, form]);

  const onSubmit = async (data: MilestoneFormData) => {
    try {
      if (milestone) {
        await updateMilestone(milestone.id, {
          name: data.name,
          phaseId: data.phaseId,
          description: data.description,
          color: data.color,
          usePhaseEndDate: data.usePhaseEndDate,
          date: data.usePhaseEndDate ? undefined : data.date,
        });
        toast.success('Marco atualizado com sucesso!');
      } else {
        await addMilestone({
          name: data.name,
          phaseId: data.phaseId,
          projectId,
          description: data.description,
          color: data.color,
          usePhaseEndDate: data.usePhaseEndDate,
          date: data.usePhaseEndDate ? undefined : data.date,
        });
        toast.success('Marco criado com sucesso!');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao salvar marco');
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {milestone ? 'Editar Marco' : 'Novo Marco'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Entrega Sprint 1, Go-Live, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phaseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fase/Sprint</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectPhases.map((phase) => (
                        <SelectItem key={phase.id} value={phase.id}>
                          <div className="flex items-center gap-2">
                            {phase.color && (
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: phase.color }}
                              />
                            )}
                            {phase.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Toggle: Usar data da fase ou manual */}
            <FormField
              control={form.control}
              name="usePhaseEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Usar data final da fase</FormLabel>
                    <FormDescription className="text-xs">
                      O marco será posicionado na última tarefa da fase
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Data manual (só aparece se usePhaseEndDate = false) */}
            {!usePhaseEndDate && (
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data do Marco</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), 'PPP', { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date?.toISOString().split('T')[0])}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: field.value }}
                            />
                            {colorOptions.find(c => c.value === field.value)?.label || 'Cor'}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {colorOptions.map((color) => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: color.value }}
                            />
                            {color.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descrição do marco..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {milestone ? 'Salvar' : 'Criar Marco'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { Milestone } from '@/lib/types';
import { toast } from 'sonner';
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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  phaseId: z.string().min(1, 'Fase é obrigatória'),
  description: z.string().optional(),
  color: z.string().optional(),
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
    },
  });

  useEffect(() => {
    if (milestone) {
      form.reset({
        name: milestone.name,
        phaseId: milestone.phaseId,
        description: milestone.description || '',
        color: milestone.color || '#EAB308',
      });
    } else {
      form.reset({
        name: '',
        phaseId: projectPhases[0]?.id || '',
        description: '',
        color: '#EAB308',
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
        });
        toast.success('Marco atualizado com sucesso!');
      } else {
        await addMilestone({
          name: data.name,
          phaseId: data.phaseId,
          projectId,
          description: data.description,
          color: data.color,
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
                    <Input placeholder="Ex: Entrega Final" {...field} />
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
                  <FormLabel>Fase</FormLabel>
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
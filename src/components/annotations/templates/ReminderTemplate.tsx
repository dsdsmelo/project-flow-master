import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '../RichTextEditor';
import { ReminderTemplateData } from '@/lib/spreadsheet-types';
import { Bell, CalendarIcon, Flag, CheckCircle2 } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ReminderTemplateProps {
  data: ReminderTemplateData;
  onChange: (data: ReminderTemplateData) => void;
}

const priorityOptions = [
  { value: 'low', label: 'Baixa', color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'medium', label: 'Média', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { value: 'high', label: 'Alta', color: 'text-orange-600', bg: 'bg-orange-100' },
  { value: 'urgent', label: 'Urgente', color: 'text-red-600', bg: 'bg-red-100' },
] as const;

const statusOptions = [
  { value: 'pending', label: 'Pendente', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { value: 'in_progress', label: 'Em Progresso', color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'completed', label: 'Concluído', color: 'text-green-600', bg: 'bg-green-100' },
] as const;

export function ReminderTemplate({ data, onChange }: ReminderTemplateProps) {
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  const selectedPriority = priorityOptions.find(p => p.value === data.priority);
  const selectedStatus = statusOptions.find(s => s.value === data.status);

  return (
    <div className="space-y-4">
      {/* Descrição */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-purple-500" />
          Descrição do Lembrete
        </Label>
        <RichTextEditor
          content={data.description}
          onChange={(html) => onChange({ ...data, description: html })}
          placeholder="Descreva o lembrete..."
          minHeight="120px"
        />
      </div>

      {/* Data Limite, Prioridade, Status */}
      <div className="grid grid-cols-3 gap-4">
        {/* Data Limite */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Data Limite
          </Label>
          <Popover open={deadlineOpen} onOpenChange={setDeadlineOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !data.deadline && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.deadline
                  ? format(new Date(data.deadline), 'dd/MM/yyyy', { locale: ptBR })
                  : 'Selecionar...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={data.deadline ? new Date(data.deadline) : undefined}
                onSelect={(date) => {
                  onChange({ ...data, deadline: date?.toISOString() });
                  setDeadlineOpen(false);
                }}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Prioridade */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Prioridade
          </Label>
          <Select
            value={data.priority}
            onValueChange={(value: ReminderTemplateData['priority']) =>
              onChange({ ...data, priority: value })
            }
          >
            <SelectTrigger>
              <SelectValue>
                {selectedPriority && (
                  <span className={cn('font-medium', selectedPriority.color)}>
                    {selectedPriority.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={cn('font-medium', option.color)}>
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Status
          </Label>
          <Select
            value={data.status}
            onValueChange={(value: ReminderTemplateData['status']) =>
              onChange({ ...data, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue>
                {selectedStatus && (
                  <span className={cn('font-medium', selectedStatus.color)}>
                    {selectedStatus.label}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className={cn('font-medium', option.color)}>
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export default ReminderTemplate;

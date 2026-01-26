import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '../RichTextEditor';
import { useData } from '@/contexts/DataContext';
import { Badge } from '@/components/ui/badge';
import { X, Users } from 'lucide-react';
import { MeetingTemplateData } from '@/lib/spreadsheet-types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MeetingTemplateProps {
  data: MeetingTemplateData;
  onChange: (data: MeetingTemplateData) => void;
}

export function MeetingTemplate({ data, onChange }: MeetingTemplateProps) {
  const { people } = useData();
  const [participantsOpen, setParticipantsOpen] = useState(false);

  const activePeople = people?.filter(p => p.active) || [];

  const handleAddParticipant = (personId: string) => {
    if (!data.participants.includes(personId)) {
      onChange({
        ...data,
        participants: [...data.participants, personId],
      });
    }
    setParticipantsOpen(false);
  };

  const handleRemoveParticipant = (personId: string) => {
    onChange({
      ...data,
      participants: data.participants.filter(id => id !== personId),
    });
  };

  const getPersonName = (personId: string) => {
    const person = people?.find(p => p.id === personId);
    return person?.name || personId;
  };

  const getPersonColor = (personId: string) => {
    const person = people?.find(p => p.id === personId);
    return person?.color || '#6B7280';
  };

  return (
    <div className="space-y-4">
      {/* Pauta / Agenda */}
      <div className="space-y-2">
        <Label htmlFor="agenda" className="text-sm font-medium">
          Pauta da Reunião
        </Label>
        <Textarea
          id="agenda"
          placeholder="Liste os tópicos a serem discutidos..."
          value={data.agenda}
          onChange={(e) => onChange({ ...data, agenda: e.target.value })}
          className="min-h-[100px] resize-y"
        />
      </div>

      {/* Participantes */}
      <div className="space-y-2">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Participantes
        </Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {data.participants.map((personId) => (
            <Badge
              key={personId}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
              style={{ borderLeftColor: getPersonColor(personId), borderLeftWidth: 3 }}
            >
              {getPersonName(personId)}
              <button
                type="button"
                onClick={() => handleRemoveParticipant(personId)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Popover open={participantsOpen} onOpenChange={setParticipantsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-sm"
            >
              + Adicionar participante
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar pessoa..." />
              <CommandList>
                <CommandEmpty>Nenhuma pessoa encontrada.</CommandEmpty>
                <CommandGroup>
                  {activePeople
                    .filter(p => !data.participants.includes(p.id))
                    .map((person) => (
                      <CommandItem
                        key={person.id}
                        value={person.name}
                        onSelect={() => handleAddParticipant(person.id)}
                      >
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: person.color }}
                        />
                        {person.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Ações/Decisões */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Ações e Decisões
        </Label>
        <RichTextEditor
          content={data.decisions}
          onChange={(html) => onChange({ ...data, decisions: html })}
          placeholder="Registre as decisões tomadas e ações definidas..."
          minHeight="120px"
        />
      </div>

      {/* Próximos Passos */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          Próximos Passos
        </Label>
        <RichTextEditor
          content={data.nextSteps}
          onChange={(html) => onChange({ ...data, nextSteps: html })}
          placeholder="Defina os próximos passos e responsáveis..."
          minHeight="100px"
        />
      </div>
    </div>
  );
}

export default MeetingTemplate;

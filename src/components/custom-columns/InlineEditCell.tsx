import { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Slider } from '@/components/ui/slider';
import { useData } from '@/contexts/DataContext';
import { CustomColumn } from '@/lib/types';
import { cn } from '@/lib/utils';
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

interface InlineEditCellProps {
  column: CustomColumn;
  value: string | number | undefined;
  onSave: (value: string | number) => void;
}

export const InlineEditCell = ({ column, value, onSave }: InlineEditCellProps) => {
  const { people } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number>(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const activePeople = people.filter(p => p.active);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(value ?? '');
    setIsEditing(true);
  };

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value ?? '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // For percentage, use popover with slider
  if (column.type === 'percentage') {
    return (
      <PercentageEditCell 
        value={value as number | undefined} 
        onSave={onSave} 
      />
    );
  }

  // Display mode for other types
  if (!isEditing) {
    return (
      <div 
        className="group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors min-h-[28px]"
        onClick={handleStartEdit}
      >
        <DisplayValue column={column} value={value} people={people} />
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    );
  }

  // Edit mode
  return (
    <div className="flex items-center gap-1">
      {column.type === 'text' && (
        <Input
          ref={inputRef}
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-sm min-w-[100px]"
        />
      )}

      {column.type === 'number' && (
        <Input
          ref={inputRef}
          type="number"
          value={editValue as number}
          onChange={(e) => setEditValue(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-sm w-20"
        />
      )}

      {column.type === 'date' && (
        <Input
          ref={inputRef}
          type="date"
          value={editValue as string}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-sm"
        />
      )}

      {/* Percentage is handled separately with PercentageEditCell */}

      {column.type === 'list' && (
        <Select 
          value={editValue as string} 
          onValueChange={(v) => {
            setEditValue(v);
            onSave(v);
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-7 text-sm min-w-[100px]">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {column.options?.map(option => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {column.type === 'user' && (
        <Select 
          value={editValue as string} 
          onValueChange={(v) => {
            setEditValue(v);
            onSave(v);
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="h-7 text-sm min-w-[120px]">
            <SelectValue placeholder="Selecionar..." />
          </SelectTrigger>
          <SelectContent>
            {activePeople.map(person => (
              <SelectItem key={person.id} value={person.id}>
                <div className="flex items-center gap-2">
                  <AvatarCircle name={person.name} color={person.color} size="xs" avatarUrl={person.avatarUrl} />
                  {person.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(column.type === 'text' || column.type === 'number' || column.type === 'date') && (
        <div className="flex gap-0.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleSave}
          >
            <Check className="w-3 h-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleCancel}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

// Percentage Edit Cell with Popover and Slider
interface PercentageEditCellProps {
  value: number | undefined;
  onSave: (value: number) => void;
}

const PercentageEditCell = ({ value, onSave }: PercentageEditCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value ?? 0);

  useEffect(() => {
    setLocalValue(value ?? 0);
  }, [value]);

  const handleSave = () => {
    onSave(localValue);
    setIsOpen(false);
  };

  const quickValues = [0, 25, 50, 75, 100];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="group flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 -mx-1 transition-colors min-h-[28px]">
          <ProgressBar value={value ?? 0} showLabel size="sm" className="min-w-[80px]" />
          <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Porcentagem</span>
            <span className="text-lg font-bold text-primary">{localValue}%</span>
          </div>
          
          <Slider
            value={[localValue]}
            onValueChange={([v]) => setLocalValue(v)}
            max={100}
            step={1}
            className="w-full"
          />

          <div className="flex gap-1 flex-wrap">
            {quickValues.map((qv) => (
              <Button
                key={qv}
                variant={localValue === qv ? "default" : "outline"}
                size="sm"
                className="flex-1 min-w-[40px]"
                onClick={() => setLocalValue(qv)}
              >
                {qv}%
              </Button>
            ))}
          </div>

          <div className="flex gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="flex-1" onClick={handleSave}>
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface DisplayValueProps {
  column: CustomColumn;
  value: string | number | undefined;
  people: { id: string; name: string; color: string; avatarUrl?: string }[];
}

const DisplayValue = ({ column, value, people }: DisplayValueProps) => {
  if (value === undefined || value === '') {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  switch (column.type) {
    case 'text':
      return <span className="text-sm truncate max-w-[150px]">{value as string}</span>;

    case 'number':
      return <span className="text-sm font-mono">{value}</span>;

    case 'date':
      return (
        <span className="text-sm">
          {new Date(value as string).toLocaleDateString('pt-BR')}
        </span>
      );

    case 'list':
      return <span className="text-sm">{value as string}</span>;

    case 'percentage':
      return <ProgressBar value={value as number} showLabel size="sm" className="min-w-[80px]" />;

    case 'user':
      const person = people.find(p => p.id === value);
      if (!person) return <span className="text-muted-foreground text-sm">-</span>;
      return (
        <div className="flex items-center gap-2">
          <AvatarCircle name={person.name} color={person.color} size="sm" avatarUrl={person.avatarUrl} />
          <span className="text-sm">{person.name}</span>
        </div>
      );

    default:
      return <span className="text-muted-foreground text-sm">-</span>;
  }
};

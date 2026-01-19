import { useState, useRef, useEffect } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { ProgressBar } from '@/components/ui/progress-bar';
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

  // Display mode
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

      {column.type === 'percentage' && (
        <Input
          ref={inputRef}
          type="number"
          min={0}
          max={100}
          value={editValue as number}
          onChange={(e) => setEditValue(Math.min(100, Math.max(0, Number(e.target.value))))}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="h-7 text-sm w-16"
        />
      )}

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
                  <AvatarCircle name={person.name} color={person.color} size="xs" />
                  {person.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(column.type === 'text' || column.type === 'number' || column.type === 'date' || column.type === 'percentage') && (
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

interface DisplayValueProps {
  column: CustomColumn;
  value: string | number | undefined;
  people: { id: string; name: string; color: string }[];
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
          <AvatarCircle name={person.name} color={person.color} size="sm" />
          <span className="text-sm">{person.name}</span>
        </div>
      );

    default:
      return <span className="text-muted-foreground text-sm">-</span>;
  }
};

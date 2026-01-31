import { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AvatarCircle } from '@/components/ui/avatar-circle';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { CustomColumn, Person } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CustomFilterValue } from './CustomColumnFilters';

interface ColumnHeaderFilterProps {
  column: CustomColumn;
  filter: CustomFilterValue | undefined;
  onChange: (value: CustomFilterValue | undefined) => void;
}

export const ColumnHeaderFilter = ({ column, filter, onChange }: ColumnHeaderFilterProps) => {
  const { people } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const activePeople = people.filter(p => p.active);

  // Verifica se há filtro ativo
  const hasActiveFilter = filter && (
    filter.text ||
    (filter.selected && filter.selected.length > 0) ||
    filter.min !== undefined ||
    filter.max !== undefined
  );

  const clearFilter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "p-0.5 rounded hover:bg-muted/80 transition-colors",
            hasActiveFilter ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter className={cn("w-3 h-3", hasActiveFilter && "fill-primary/20")} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtrar: {column.name}</span>
            {hasActiveFilter && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilter}>
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <FilterContent
            column={column}
            filter={filter || {}}
            onChange={onChange}
            people={activePeople}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface FilterContentProps {
  column: CustomColumn;
  filter: CustomFilterValue;
  onChange: (value: CustomFilterValue | undefined) => void;
  people: Person[];
}

const FilterContent = ({ column, filter, onChange, people }: FilterContentProps) => {
  switch (column.type) {
    case 'text':
      return (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={filter.text || ''}
            onChange={(e) => onChange({ ...filter, text: e.target.value || undefined })}
            placeholder="Buscar..."
            className="pl-8 h-8 text-sm"
            autoFocus
          />
        </div>
      );

    case 'list':
      return (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {(column.options || []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhuma opção</p>
          ) : (
            column.options?.map(option => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
              >
                <Checkbox
                  checked={(filter.selected || []).includes(option)}
                  onCheckedChange={(checked) => {
                    const current = filter.selected || [];
                    const updated = checked
                      ? [...current, option]
                      : current.filter(s => s !== option);
                    onChange({ ...filter, selected: updated.length ? updated : undefined });
                  }}
                />
                <span className="text-sm">{option}</span>
              </label>
            ))
          )}
        </div>
      );

    case 'user':
      return (
        <div className="space-y-1 max-h-[200px] overflow-y-auto">
          {people.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Nenhum usuário</p>
          ) : (
            people.map(person => (
              <label
                key={person.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1.5"
              >
                <Checkbox
                  checked={(filter.selected || []).includes(person.id)}
                  onCheckedChange={(checked) => {
                    const current = filter.selected || [];
                    const updated = checked
                      ? [...current, person.id]
                      : current.filter(s => s !== person.id);
                    onChange({ ...filter, selected: updated.length ? updated : undefined });
                  }}
                />
                <AvatarCircle name={person.name} color={person.color} size="xs" avatarUrl={person.avatarUrl} />
                <span className="text-sm">{person.name}</span>
              </label>
            ))
          )}
        </div>
      );

    case 'date':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">De</label>
            <Input
              type="date"
              value={(filter.min as string) || ''}
              onChange={(e) => onChange({ ...filter, min: e.target.value || undefined })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Até</label>
            <Input
              type="date"
              value={(filter.max as string) || ''}
              onChange={(e) => onChange({ ...filter, max: e.target.value || undefined })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      );

    case 'number':
    case 'percentage':
      return (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mínimo</label>
            <Input
              type="number"
              value={filter.min ?? ''}
              onChange={(e) => onChange({ ...filter, min: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 text-sm"
              placeholder="Min"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Máximo</label>
            <Input
              type="number"
              value={filter.max ?? ''}
              onChange={(e) => onChange({ ...filter, max: e.target.value ? Number(e.target.value) : undefined })}
              className="h-8 text-sm"
              placeholder="Max"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

// Componente para mostrar filtros ativos como badges
interface ActiveFiltersBarProps {
  filters: Record<string, CustomFilterValue>;
  columns: CustomColumn[];
  onClear: (columnId: string) => void;
  onClearAll: () => void;
}

export const ActiveFiltersBar = ({ filters, columns, onClear, onClearAll }: ActiveFiltersBarProps) => {
  const { people } = useData();

  const activeFilters = Object.entries(filters).filter(([_, filter]) => {
    return filter.text || (filter.selected && filter.selected.length > 0) || filter.min !== undefined || filter.max !== undefined;
  });

  if (activeFilters.length === 0) return null;

  const getFilterLabel = (columnId: string, filter: CustomFilterValue): string => {
    const column = columns.find(c => c.id === columnId);
    if (!column) return '';

    if (filter.text) return `"${filter.text}"`;
    if (filter.selected && filter.selected.length > 0) {
      if (column.type === 'user') {
        const names = filter.selected.map(id => people.find(p => p.id === id)?.name || id);
        return names.length > 2 ? `${names.length} selecionados` : names.join(', ');
      }
      return filter.selected.length > 2 ? `${filter.selected.length} selecionados` : filter.selected.join(', ');
    }
    if (filter.min !== undefined || filter.max !== undefined) {
      if (filter.min !== undefined && filter.max !== undefined) {
        return `${filter.min} - ${filter.max}`;
      }
      if (filter.min !== undefined) return `≥ ${filter.min}`;
      if (filter.max !== undefined) return `≤ ${filter.max}`;
    }
    return '';
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filtros:</span>
      {activeFilters.map(([columnId, filter]) => {
        const column = columns.find(c => c.id === columnId);
        if (!column) return null;

        return (
          <Badge key={columnId} variant="secondary" className="gap-1 text-xs">
            <span className="font-medium">{column.name}:</span>
            <span className="font-normal">{getFilterLabel(columnId, filter)}</span>
            <button onClick={() => onClear(columnId)} className="ml-1 hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        );
      })}
      {activeFilters.length > 1 && (
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearAll}>
          Limpar todos
        </Button>
      )}
    </div>
  );
};
